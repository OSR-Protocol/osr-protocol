use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint, Burn};

declare_id!("ESCRWVesting1111111111111111111111111111111");

// D-006: Vesting schedule constants
// 20% released at TGE, 1 month cliff, then linear monthly over 4 months
const TGE_BASIS_POINTS: u64 = 2000; // 20% in basis points
const BASIS_POINTS_TOTAL: u64 = 10000;
const SECONDS_PER_DAY: i64 = 86400;
const CLIFF_DAYS: i64 = 30; // 1 month cliff after TGE
const VESTING_MONTHS: u64 = 4; // 4 months of linear unlock after cliff
const VESTING_DAYS: i64 = 150; // 5 months total (30 day cliff + 120 day linear)
const MONTH_SECONDS: i64 = 30 * SECONDS_PER_DAY; // 30 days per month

// Magic number for initialization guard
const VESTING_MAGIC: u64 = 0x4F53525F56455354; // "OSR_VEST"

#[program]
pub mod escrow {
    use super::*;

    /// Initialize a vesting schedule for a presale buyer.
    /// Called by the presale authority after a purchase.
    /// Tokens must already be deposited in the escrow vault.
    pub fn initialize_vesting(
        ctx: Context<InitializeVesting>,
        total_tokens: u64,
        start_timestamp: i64,
    ) -> Result<()> {
        require!(total_tokens > 0, EscrowError::ZeroAmount);
        require!(start_timestamp > 0, EscrowError::InvalidTimestamp);

        let schedule = &mut ctx.accounts.vesting_schedule;

        // Prevent reinitialization
        require!(
            schedule.init_magic != VESTING_MAGIC,
            EscrowError::AlreadyInitialized
        );

        let tge_amount = total_tokens
            .checked_mul(TGE_BASIS_POINTS)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?
            .checked_div(BASIS_POINTS_TOTAL)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?;

        let cliff_end = start_timestamp
            .checked_add(CLIFF_DAYS.checked_mul(SECONDS_PER_DAY)
                .ok_or(error!(EscrowError::ArithmeticOverflow))?)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?;

        let vesting_end = start_timestamp
            .checked_add(VESTING_DAYS.checked_mul(SECONDS_PER_DAY)
                .ok_or(error!(EscrowError::ArithmeticOverflow))?)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?;

        schedule.init_magic = VESTING_MAGIC;
        schedule.buyer = ctx.accounts.buyer.key();
        schedule.token_mint = ctx.accounts.token_mint.key();
        schedule.escrow_vault = ctx.accounts.escrow_vault.key();
        schedule.total_tokens = total_tokens;
        schedule.tokens_released = 0;
        schedule.tokens_burned = 0;
        schedule.tge_amount = tge_amount;
        schedule.start_timestamp = start_timestamp;
        schedule.cliff_end = cliff_end;
        schedule.vesting_end = vesting_end;

        emit!(VestingInitialized {
            buyer: ctx.accounts.buyer.key(),
            total_tokens,
            tge_amount,
            start_timestamp,
            cliff_end,
            vesting_end,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Release vested tokens to the buyer.
    /// Calculates the vested amount based on current time and transfers
    /// any newly vested tokens from escrow vault to the buyer.
    pub fn release_tokens(ctx: Context<ReleaseTokens>) -> Result<()> {
        let clock = Clock::get()?;
        let schedule = &ctx.accounts.vesting_schedule;

        // Validate initialization
        require!(
            schedule.init_magic == VESTING_MAGIC,
            EscrowError::NotInitialized
        );

        // Calculate total vested amount at current time
        let vested = calculate_vested_amount(
            schedule.total_tokens,
            schedule.tokens_burned,
            schedule.tge_amount,
            schedule.start_timestamp,
            schedule.cliff_end,
            schedule.vesting_end,
            clock.unix_timestamp,
        )?;

        // Calculate how many new tokens to release
        let releasable = vested
            .checked_sub(schedule.tokens_released)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?;

        require!(releasable > 0, EscrowError::NothingToRelease);

        // Transfer tokens from escrow vault to buyer
        let buyer_key = schedule.buyer;
        let bump = ctx.bumps.vault_authority;
        let seeds = &[b"escrow_auth", buyer_key.as_ref(), &[bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[seeds],
            ),
            releasable,
        )?;

        // Update state
        let schedule_mut = &mut ctx.accounts.vesting_schedule;
        schedule_mut.tokens_released = schedule_mut.tokens_released
            .checked_add(releasable)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?;

        emit!(TokensReleased {
            buyer: buyer_key,
            amount: releasable,
            total_released: schedule_mut.tokens_released,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Burn tokens for compute credits. Bypasses vesting restrictions.
    /// This is the key mechanism: platform consumption is unrestricted.
    /// Burns from escrow vault, reduces total_tokens proportionally.
    pub fn burn_for_compute(ctx: Context<BurnForCompute>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let schedule = &ctx.accounts.vesting_schedule;

        // Validate initialization
        require!(
            schedule.init_magic == VESTING_MAGIC,
            EscrowError::NotInitialized
        );
        require!(amount > 0, EscrowError::ZeroAmount);

        // Cannot burn more than remaining tokens in escrow
        let remaining_in_escrow = schedule.total_tokens
            .checked_sub(schedule.tokens_released)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?
            .checked_sub(schedule.tokens_burned)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?;

        require!(amount <= remaining_in_escrow, EscrowError::InsufficientTokens);

        // Burn tokens from escrow vault
        let buyer_key = schedule.buyer;
        let bump = ctx.bumps.vault_authority;
        let seeds = &[b"escrow_auth", buyer_key.as_ref(), &[bump]];

        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.token_mint.to_account_info(),
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        // Update state: reduce total_tokens and recalculate tge_amount
        let schedule_mut = &mut ctx.accounts.vesting_schedule;
        schedule_mut.tokens_burned = schedule_mut.tokens_burned
            .checked_add(amount)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?;

        // Recalculate tge_amount proportionally based on remaining effective tokens
        let effective_total = schedule_mut.total_tokens
            .checked_sub(schedule_mut.tokens_burned)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?;

        schedule_mut.tge_amount = effective_total
            .checked_mul(TGE_BASIS_POINTS)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?
            .checked_div(BASIS_POINTS_TOTAL)
            .ok_or(error!(EscrowError::ArithmeticOverflow))?;

        emit!(TokensBurnedForCompute {
            buyer: buyer_key,
            amount,
            remaining_total: effective_total,
            new_tge_amount: schedule_mut.tge_amount,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

// Calculates total vested amount at a given timestamp.
// Schedule: 20% at TGE, 1 month cliff, then 20% per month for 4 months.
// Burns reduce the effective total proportionally.
fn calculate_vested_amount(
    total_tokens: u64,
    tokens_burned: u64,
    tge_amount: u64,
    start_timestamp: i64,
    cliff_end: i64,
    vesting_end: i64,
    current_time: i64,
) -> Result<u64> {
    // Effective total after burns
    let effective_total = total_tokens
        .checked_sub(tokens_burned)
        .ok_or(error!(EscrowError::ArithmeticOverflow))?;

    // Before TGE: nothing vested
    if current_time < start_timestamp {
        return Ok(0);
    }

    // At or after TGE but before cliff end: only TGE amount (20%)
    if current_time < cliff_end {
        return Ok(tge_amount);
    }

    // After vesting_end: everything vested
    if current_time >= vesting_end {
        return Ok(effective_total);
    }

    // During linear vesting (after cliff, before vesting_end):
    // tge_amount + (remaining_80% * elapsed_months / 4)
    let remaining = effective_total
        .checked_sub(tge_amount)
        .ok_or(error!(EscrowError::ArithmeticOverflow))?;

    let time_since_cliff = current_time
        .checked_sub(cliff_end)
        .ok_or(error!(EscrowError::ArithmeticOverflow))?;

    // Calculate elapsed complete months since cliff (each month = 30 days)
    let elapsed_months = (time_since_cliff / MONTH_SECONDS) as u64;

    // Cap at 4 months
    let capped_months = if elapsed_months > VESTING_MONTHS {
        VESTING_MONTHS
    } else {
        elapsed_months
    };

    let vested_from_linear = remaining
        .checked_mul(capped_months)
        .ok_or(error!(EscrowError::ArithmeticOverflow))?
        .checked_div(VESTING_MONTHS)
        .ok_or(error!(EscrowError::ArithmeticOverflow))?;

    let total_vested = tge_amount
        .checked_add(vested_from_linear)
        .ok_or(error!(EscrowError::ArithmeticOverflow))?;

    Ok(total_vested)
}

// -- ACCOUNTS --

#[derive(Accounts)]
pub struct InitializeVesting<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + VestingSchedule::INIT_SPACE,
        seeds = [b"vesting", buyer.key().as_ref()],
        bump,
    )]
    pub vesting_schedule: Account<'info, VestingSchedule>,

    pub token_mint: Account<'info, Mint>,

    /// Escrow vault holding the buyer's tokens. Must be owned by the vault authority PDA.
    #[account(
        constraint = escrow_vault.mint == token_mint.key() @ EscrowError::VaultMintMismatch,
        constraint = escrow_vault.owner == vault_authority.key() @ EscrowError::VaultAuthorityMismatch,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA that owns the escrow vault
    #[account(seeds = [b"escrow_auth", buyer.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    /// CHECK: The buyer whose tokens are being vested
    pub buyer: UncheckedAccount<'info>,

    /// Presale authority (signer). Only the presale admin can create vesting schedules.
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseTokens<'info> {
    #[account(
        mut,
        seeds = [b"vesting", buyer.key().as_ref()],
        bump,
        constraint = vesting_schedule.buyer == buyer.key() @ EscrowError::BuyerMismatch,
        constraint = vesting_schedule.escrow_vault == escrow_vault.key() @ EscrowError::VaultMismatch,
    )]
    pub vesting_schedule: Account<'info, VestingSchedule>,

    #[account(
        mut,
        constraint = escrow_vault.mint == vesting_schedule.token_mint @ EscrowError::VaultMintMismatch,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// CHECK: PDA that owns the escrow vault
    #[account(seeds = [b"escrow_auth", buyer.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    /// Buyer must sign to claim their vested tokens
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key() @ EscrowError::TokenAccountOwnerMismatch,
        constraint = buyer_token_account.mint == vesting_schedule.token_mint @ EscrowError::VaultMintMismatch,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnForCompute<'info> {
    #[account(
        mut,
        seeds = [b"vesting", buyer.key().as_ref()],
        bump,
        constraint = vesting_schedule.buyer == buyer.key() @ EscrowError::BuyerMismatch,
        constraint = vesting_schedule.escrow_vault == escrow_vault.key() @ EscrowError::VaultMismatch,
    )]
    pub vesting_schedule: Account<'info, VestingSchedule>,

    #[account(
        mut,
        constraint = escrow_vault.mint == token_mint.key() @ EscrowError::VaultMintMismatch,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = token_mint.key() == vesting_schedule.token_mint @ EscrowError::VaultMintMismatch,
    )]
    pub token_mint: Account<'info, Mint>,

    /// CHECK: PDA that owns the escrow vault
    #[account(seeds = [b"escrow_auth", buyer.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    /// Buyer must sign to burn their tokens for compute
    #[account(mut)]
    pub buyer: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// -- STATE --

#[account]
#[derive(InitSpace)]
pub struct VestingSchedule {
    pub init_magic: u64,          // 8  - reinitialization guard
    pub buyer: Pubkey,            // 32 - buyer wallet address
    pub token_mint: Pubkey,       // 32 - OSR token mint
    pub escrow_vault: Pubkey,     // 32 - escrow token account holding locked tokens
    pub total_tokens: u64,        // 8  - total purchased in presale
    pub tokens_released: u64,     // 8  - cumulative tokens released to buyer
    pub tokens_burned: u64,       // 8  - cumulative tokens burned for compute
    pub tge_amount: u64,          // 8  - 20% of effective total, released at TGE
    pub start_timestamp: i64,     // 8  - TGE timestamp
    pub cliff_end: i64,           // 8  - start + 30 days
    pub vesting_end: i64,         // 8  - start + 150 days (5 months total)
}

// -- EVENTS --

#[event]
pub struct VestingInitialized {
    pub buyer: Pubkey,
    pub total_tokens: u64,
    pub tge_amount: u64,
    pub start_timestamp: i64,
    pub cliff_end: i64,
    pub vesting_end: i64,
    pub timestamp: i64,
}

#[event]
pub struct TokensReleased {
    pub buyer: Pubkey,
    pub amount: u64,
    pub total_released: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensBurnedForCompute {
    pub buyer: Pubkey,
    pub amount: u64,
    pub remaining_total: u64,
    pub new_tge_amount: u64,
    pub timestamp: i64,
}

// -- ERRORS --

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Vesting schedule already initialized")]
    AlreadyInitialized,
    #[msg("Vesting schedule not initialized")]
    NotInitialized,
    #[msg("No tokens available to release")]
    NothingToRelease,
    #[msg("Insufficient tokens in escrow")]
    InsufficientTokens,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Buyer does not match vesting schedule")]
    BuyerMismatch,
    #[msg("Vault does not match vesting schedule")]
    VaultMismatch,
    #[msg("Vault mint does not match expected mint")]
    VaultMintMismatch,
    #[msg("Vault authority does not match PDA")]
    VaultAuthorityMismatch,
    #[msg("Token account owner does not match buyer")]
    TokenAccountOwnerMismatch,
}
