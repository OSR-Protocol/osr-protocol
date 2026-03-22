use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

declare_id!("9K1VNBCK6WRDVzYbidG4hH9L3crPXxhqvTBACqM5q8bi");

// D-004: 100M tokens for presale
const PRESALE_ALLOCATION: u64 = 100_000_000_000_000_000; // 100M * 10^9

// Minimum presale purchase: $250 USD
// In USDC/USDT/PYUSD (6 decimals): 250 * 10^6
const MIN_PURCHASE_STABLECOIN: u64 = 250_000_000;

// D-005: Floor price $0.005 per token
// In stablecoin units (6 decimals) per 10^9 token-units:
// $0.005 = 5000 stablecoin-units per 10^9 token-units
const FLOOR_PRICE_PER_BILLION: u64 = 5000;

// Magic number for buyer record initialization guard
const BUYER_MAGIC: u64 = 0x4F53525F42555952; // "OSR_BUYR"

#[program]
pub mod presale {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        sol_price_lamports: u64,
        min_purchase_lamports: u64,
        max_per_wallet: u64,
        max_raise_lamports: u64,
        max_raise_stablecoin: u64,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        // Input validation
        require!(start_time < end_time, PresaleError::InvalidTimeRange);
        require!(max_per_wallet > 0, PresaleError::InvalidWalletLimit);
        require!(sol_price_lamports > 0, PresaleError::InvalidPrice);
        require!(min_purchase_lamports > 0, PresaleError::InvalidPrice);

        let presale = &mut ctx.accounts.presale;
        presale.authority = ctx.accounts.authority.key();
        presale.token_mint = ctx.accounts.token_mint.key();
        presale.token_vault = ctx.accounts.token_vault.key();
        presale.sol_vault = ctx.accounts.sol_vault.key();
        presale.usdc_vault = ctx.accounts.usdc_vault.key();
        presale.usdc_mint = ctx.accounts.usdc_mint.key();
        presale.usdt_vault = ctx.accounts.usdt_vault.key();
        presale.usdt_mint = ctx.accounts.usdt_mint.key();
        presale.pyusd_vault = ctx.accounts.pyusd_vault.key();
        presale.pyusd_mint = ctx.accounts.pyusd_mint.key();
        presale.sol_price_lamports = sol_price_lamports;
        presale.min_purchase_lamports = min_purchase_lamports;
        presale.max_per_wallet = max_per_wallet;
        presale.max_raise_lamports = max_raise_lamports;
        presale.max_raise_stablecoin = max_raise_stablecoin;
        presale.tokens_sold = 0;
        presale.total_raised_sol = 0;
        presale.total_raised_stablecoin = 0;
        presale.start_time = start_time;
        presale.end_time = end_time;
        presale.is_active = false;
        presale.vault_bump = ctx.bumps.vault_authority;

        emit!(PresaleInitialized {
            authority: ctx.accounts.authority.key(),
            token_mint: ctx.accounts.token_mint.key(),
            sol_price_lamports,
            min_purchase_lamports,
            max_per_wallet,
            max_raise_lamports,
            max_raise_stablecoin,
            start_time,
            end_time,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn activate(ctx: Context<AdminAction>) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        require!(!presale.is_active, PresaleError::AlreadyActive);
        presale.is_active = true;
        emit!(PresaleActivated { timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn pause(ctx: Context<AdminAction>) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        require!(presale.is_active, PresaleError::NotActive);
        presale.is_active = false;
        emit!(PresalePaused { timestamp: Clock::get()?.unix_timestamp });
        Ok(())
    }

    pub fn update_sol_price(
        ctx: Context<AdminAction>,
        new_price: u64,
        new_min_purchase: u64,
    ) -> Result<()> {
        require!(new_price > 0, PresaleError::InvalidPrice);
        require!(new_min_purchase > 0, PresaleError::InvalidPrice);

        let old = ctx.accounts.presale.sol_price_lamports;
        ctx.accounts.presale.sol_price_lamports = new_price;
        ctx.accounts.presale.min_purchase_lamports = new_min_purchase;

        emit!(PriceUpdated {
            old_price: old,
            new_price,
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Buy $OSR with SOL
    pub fn buy_with_sol(ctx: Context<BuyWithSol>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;

        // Read all state before mutation
        let is_active = ctx.accounts.presale.is_active;
        let start_time = ctx.accounts.presale.start_time;
        let end_time = ctx.accounts.presale.end_time;
        let tokens_sold = ctx.accounts.presale.tokens_sold;
        let sol_price = ctx.accounts.presale.sol_price_lamports;
        let min_purchase = ctx.accounts.presale.min_purchase_lamports;
        let max_per_wallet = ctx.accounts.presale.max_per_wallet;
        let max_raise = ctx.accounts.presale.max_raise_lamports;
        let total_raised = ctx.accounts.presale.total_raised_sol;
        let mint_key = ctx.accounts.presale.token_mint;
        let vault_bump = ctx.accounts.presale.vault_bump;
        let buyer_purchased = ctx.accounts.buyer_record.total_purchased;

        // Presale state checks
        require!(is_active, PresaleError::NotActive);
        require!(clock.unix_timestamp >= start_time, PresaleError::NotStarted);
        require!(clock.unix_timestamp <= end_time, PresaleError::Ended);
        require!(amount > 0, PresaleError::ZeroAmount);

        // Allocation check
        let new_total_sold = tokens_sold
            .checked_add(amount)
            .ok_or(error!(PresaleError::ArithmeticOverflow))?;
        require!(new_total_sold <= PRESALE_ALLOCATION, PresaleError::SoldOut);

        // Per-wallet limit
        let new_buyer_total = buyer_purchased
            .checked_add(amount)
            .ok_or(error!(PresaleError::ArithmeticOverflow))?;
        require!(new_buyer_total <= max_per_wallet, PresaleError::ExceedsWalletLimit);

        // Cost in lamports (D-014: integer math, protocol-favorable rounding)
        let cost = (amount as u128)
            .checked_mul(sol_price as u128)
            .ok_or(error!(PresaleError::ArithmeticOverflow))?
            .checked_div(1_000_000_000u128)
            .ok_or(error!(PresaleError::ArithmeticOverflow))? as u64;
        require!(cost > 0, PresaleError::InvalidPrice);

        // Minimum purchase enforcement ($250 equivalent in lamports)
        require!(cost >= min_purchase, PresaleError::BelowMinimumSol);

        // Hard cap check (D-005)
        if max_raise > 0 {
            let new_total_raised = total_raised
                .checked_add(cost)
                .ok_or(error!(PresaleError::ArithmeticOverflow))?;
            require!(new_total_raised <= max_raise, PresaleError::HardCapReached);
        }

        // SOL transfer: buyer -> presale account (program-owned, safe to debit later)
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.presale.to_account_info(),
                },
            ),
            cost,
        )?;

        // Token transfer: vault -> buyer (PDA signs)
        let seeds = &[b"vault_auth", mint_key.as_ref(), &[vault_bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        // Update presale state
        ctx.accounts.presale.tokens_sold = new_total_sold;
        ctx.accounts.presale.total_raised_sol = total_raised
            .checked_add(cost)
            .ok_or(error!(PresaleError::ArithmeticOverflow))?;

        // Update buyer record with initialization guard
        let buyer_record = &mut ctx.accounts.buyer_record;
        if buyer_record.init_magic != BUYER_MAGIC {
            buyer_record.init_magic = BUYER_MAGIC;
            buyer_record.buyer = ctx.accounts.buyer.key();
        } else {
            require!(
                buyer_record.buyer == ctx.accounts.buyer.key(),
                PresaleError::BuyerMismatch
            );
        }
        buyer_record.total_purchased = new_buyer_total;

        emit!(TokensPurchased {
            buyer: ctx.accounts.buyer.key(),
            amount,
            cost,
            payment: PaymentMethod::Sol,
            total_sold: ctx.accounts.presale.tokens_sold,
            timestamp: clock.unix_timestamp,
        });
        Ok(())
    }

    /// Buy $OSR with a stablecoin (USDC, USDT, or PYUSD — D-011)
    /// `stablecoin_amount` is in stablecoin units (6 decimals)
    /// Validates: $250 minimum, $0.005 floor price, stablecoin hard cap
    pub fn buy_with_stablecoin(
        ctx: Context<BuyWithStablecoin>,
        amount: u64,
        stablecoin_amount: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // Read all state before mutation
        let is_active = ctx.accounts.presale.is_active;
        let start_time = ctx.accounts.presale.start_time;
        let end_time = ctx.accounts.presale.end_time;
        let tokens_sold = ctx.accounts.presale.tokens_sold;
        let max_per_wallet = ctx.accounts.presale.max_per_wallet;
        let max_raise_stable = ctx.accounts.presale.max_raise_stablecoin;
        let mint_key = ctx.accounts.presale.token_mint;
        let vault_bump = ctx.accounts.presale.vault_bump;
        let buyer_purchased = ctx.accounts.buyer_record.total_purchased;
        let total_raised = ctx.accounts.presale.total_raised_stablecoin;
        let usdc_mint = ctx.accounts.presale.usdc_mint;
        let usdt_mint = ctx.accounts.presale.usdt_mint;
        let pyusd_mint = ctx.accounts.presale.pyusd_mint;

        // Verify the stablecoin mint is one of the accepted ones
        let stable_mint = ctx.accounts.buyer_stablecoin_account.mint;
        require!(
            stable_mint == usdc_mint
                || stable_mint == usdt_mint
                || stable_mint == pyusd_mint,
            PresaleError::UnsupportedStablecoin
        );

        // Presale state checks
        require!(is_active, PresaleError::NotActive);
        require!(clock.unix_timestamp >= start_time, PresaleError::NotStarted);
        require!(clock.unix_timestamp <= end_time, PresaleError::Ended);
        require!(amount > 0, PresaleError::ZeroAmount);
        require!(stablecoin_amount > 0, PresaleError::ZeroAmount);

        // Allocation check
        let new_total_sold = tokens_sold
            .checked_add(amount)
            .ok_or(error!(PresaleError::ArithmeticOverflow))?;
        require!(new_total_sold <= PRESALE_ALLOCATION, PresaleError::SoldOut);

        // Per-wallet limit
        let new_buyer_total = buyer_purchased
            .checked_add(amount)
            .ok_or(error!(PresaleError::ArithmeticOverflow))?;
        require!(new_buyer_total <= max_per_wallet, PresaleError::ExceedsWalletLimit);

        // Minimum $250 purchase
        require!(stablecoin_amount >= MIN_PURCHASE_STABLECOIN, PresaleError::BelowMinimum);

        // Floor price: $0.005 per token (D-005)
        let min_stablecoin = (amount as u128)
            .checked_mul(FLOOR_PRICE_PER_BILLION as u128)
            .ok_or(error!(PresaleError::ArithmeticOverflow))?
            .checked_div(1_000_000_000u128)
            .ok_or(error!(PresaleError::ArithmeticOverflow))? as u64;
        require!(stablecoin_amount >= min_stablecoin, PresaleError::BelowFloorPrice);

        // Stablecoin hard cap check
        if max_raise_stable > 0 {
            let new_total_raised = total_raised
                .checked_add(stablecoin_amount)
                .ok_or(error!(PresaleError::ArithmeticOverflow))?;
            require!(new_total_raised <= max_raise_stable, PresaleError::StablecoinCapReached);
        }

        // Stablecoin transfer: buyer -> vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_stablecoin_account.to_account_info(),
                    to: ctx.accounts.stablecoin_vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            stablecoin_amount,
        )?;

        // Token transfer: vault -> buyer (PDA signs)
        let seeds = &[b"vault_auth", mint_key.as_ref(), &[vault_bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        // Update presale state
        ctx.accounts.presale.tokens_sold = new_total_sold;
        ctx.accounts.presale.total_raised_stablecoin = total_raised
            .checked_add(stablecoin_amount)
            .ok_or(error!(PresaleError::ArithmeticOverflow))?;

        // Update buyer record with initialization guard
        let buyer_record = &mut ctx.accounts.buyer_record;
        if buyer_record.init_magic != BUYER_MAGIC {
            buyer_record.init_magic = BUYER_MAGIC;
            buyer_record.buyer = ctx.accounts.buyer.key();
        } else {
            require!(
                buyer_record.buyer == ctx.accounts.buyer.key(),
                PresaleError::BuyerMismatch
            );
        }
        buyer_record.total_purchased = new_buyer_total;

        let payment = if stable_mint == usdc_mint {
            PaymentMethod::Usdc
        } else if stable_mint == usdt_mint {
            PaymentMethod::Usdt
        } else {
            PaymentMethod::Pyusd
        };

        emit!(TokensPurchased {
            buyer: ctx.accounts.buyer.key(),
            amount,
            cost: stablecoin_amount,
            payment,
            total_sold: ctx.accounts.presale.tokens_sold,
            timestamp: clock.unix_timestamp,
        });
        Ok(())
    }

    /// Admin withdraws SOL from presale account — only after presale ends or is paused (D-016)
    pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let presale_info = ctx.accounts.presale.to_account_info();

        // Prevent mid-presale withdrawal: must be ended or paused
        require!(
            clock.unix_timestamp > ctx.accounts.presale.end_time
                || !ctx.accounts.presale.is_active,
            PresaleError::PresaleNotEnded
        );

        // Available = lamports beyond rent-exemption for the presale data account
        let rent = Rent::get()?.minimum_balance(presale_info.data_len());
        let available = presale_info
            .lamports()
            .checked_sub(rent)
            .ok_or(error!(PresaleError::InsufficientFunds))?;
        require!(amount <= available, PresaleError::InsufficientFunds);

        // Presale account is program-owned — safe to debit
        **presale_info.try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.authority.to_account_info().try_borrow_mut_lamports()? += amount;

        emit!(FundsWithdrawn {
            amount,
            asset: WithdrawAsset::Sol,
            timestamp: clock.unix_timestamp,
        });
        Ok(())
    }

    /// Admin withdraws stablecoin — only after presale ends or is paused
    pub fn withdraw_stablecoin(ctx: Context<WithdrawStablecoin>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        let presale = &ctx.accounts.presale;

        // Prevent mid-presale withdrawal: must be ended or paused
        require!(
            clock.unix_timestamp > presale.end_time || !presale.is_active,
            PresaleError::PresaleNotEnded
        );

        let mint_key = presale.token_mint;
        let bump = presale.vault_bump;
        let seeds = &[b"vault_auth", mint_key.as_ref(), &[bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.stablecoin_vault.to_account_info(),
                    to: ctx.accounts.authority_stablecoin_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        emit!(FundsWithdrawn {
            amount,
            asset: WithdrawAsset::Stablecoin,
            timestamp: clock.unix_timestamp,
        });
        Ok(())
    }

    /// Admin withdraws unsold tokens after presale ends
    pub fn withdraw_unsold(ctx: Context<WithdrawUnsold>, amount: u64) -> Result<()> {
        let presale = &ctx.accounts.presale;
        let clock = Clock::get()?;
        require!(clock.unix_timestamp > presale.end_time, PresaleError::NotEnded);

        let mint_key = presale.token_mint;
        let seeds = &[b"vault_auth", mint_key.as_ref(), &[presale.vault_bump]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.authority_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        emit!(FundsWithdrawn {
            amount,
            asset: WithdrawAsset::UnsoldTokens,
            timestamp: clock.unix_timestamp,
        });
        Ok(())
    }

    /// Close presale account and recover rent after presale ends
    pub fn close_presale(_ctx: Context<ClosePresale>) -> Result<()> {
        // Time check enforced via account constraint
        emit!(PresaleClosed {
            timestamp: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }
}

// ── ACCOUNTS ──

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + PresaleState::INIT_SPACE)]
    pub presale: Box<Account<'info, PresaleState>>,
    pub token_mint: Box<Account<'info, Mint>>,
    #[account(
        constraint = token_vault.mint == token_mint.key() @ PresaleError::VaultMintMismatch,
        constraint = token_vault.owner == vault_authority.key() @ PresaleError::VaultAuthorityMismatch,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,
    /// CHECK: PDA that owns the token vault
    #[account(seeds = [b"vault_auth", token_mint.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    /// CHECK: SOL vault — validated as system-owned empty account
    #[account(mut, constraint = sol_vault.data_is_empty() @ PresaleError::InvalidSolVault)]
    pub sol_vault: UncheckedAccount<'info>,
    pub usdc_mint: Box<Account<'info, Mint>>,
    #[account(
        constraint = usdc_vault.mint == usdc_mint.key() @ PresaleError::VaultMintMismatch,
        constraint = usdc_vault.owner == vault_authority.key() @ PresaleError::VaultAuthorityMismatch,
    )]
    pub usdc_vault: Box<Account<'info, TokenAccount>>,
    pub usdt_mint: Box<Account<'info, Mint>>,
    #[account(
        constraint = usdt_vault.mint == usdt_mint.key() @ PresaleError::VaultMintMismatch,
        constraint = usdt_vault.owner == vault_authority.key() @ PresaleError::VaultAuthorityMismatch,
    )]
    pub usdt_vault: Box<Account<'info, TokenAccount>>,
    pub pyusd_mint: Box<Account<'info, Mint>>,
    #[account(
        constraint = pyusd_vault.mint == pyusd_mint.key() @ PresaleError::VaultMintMismatch,
        constraint = pyusd_vault.owner == vault_authority.key() @ PresaleError::VaultAuthorityMismatch,
    )]
    pub pyusd_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(mut, has_one = authority)]
    pub presale: Account<'info, PresaleState>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BuyWithSol<'info> {
    #[account(mut)]
    pub presale: Account<'info, PresaleState>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_auth", presale.token_mint.as_ref()], bump = presale.vault_bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut, constraint = token_vault.key() == presale.token_vault)]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == presale.token_mint,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed, payer = buyer,
        space = 8 + BuyerRecord::INIT_SPACE,
        seeds = [b"buyer", presale.key().as_ref(), buyer.key().as_ref()], bump,
    )]
    pub buyer_record: Account<'info, BuyerRecord>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuyWithStablecoin<'info> {
    #[account(mut)]
    pub presale: Box<Account<'info, PresaleState>>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_auth", presale.token_mint.as_ref()], bump = presale.vault_bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut, constraint = token_vault.key() == presale.token_vault)]
    pub token_vault: Box<Account<'info, TokenAccount>>,
    /// C-1 FIX: Validate stablecoin vault matches one of the three configured vaults
    #[account(
        mut,
        constraint = (
            stablecoin_vault.key() == presale.usdc_vault
            || stablecoin_vault.key() == presale.usdt_vault
            || stablecoin_vault.key() == presale.pyusd_vault
        ) @ PresaleError::UnsupportedStablecoin,
        constraint = stablecoin_vault.mint == buyer_stablecoin_account.mint @ PresaleError::VaultMintMismatch,
    )]
    pub stablecoin_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == presale.token_mint,
    )]
    pub buyer_token_account: Box<Account<'info, TokenAccount>>,
    /// Buyer's stablecoin account (must match one of the accepted mints)
    #[account(mut, constraint = buyer_stablecoin_account.owner == buyer.key())]
    pub buyer_stablecoin_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed, payer = buyer,
        space = 8 + BuyerRecord::INIT_SPACE,
        seeds = [b"buyer", presale.key().as_ref(), buyer.key().as_ref()], bump,
    )]
    pub buyer_record: Account<'info, BuyerRecord>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(mut, has_one = authority)]
    pub presale: Account<'info, PresaleState>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

/// C-2 FIX: Validate stablecoin vault matches one of the three configured vaults
#[derive(Accounts)]
pub struct WithdrawStablecoin<'info> {
    #[account(has_one = authority)]
    pub presale: Account<'info, PresaleState>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_auth", presale.token_mint.as_ref()], bump = presale.vault_bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = (
            stablecoin_vault.key() == presale.usdc_vault
            || stablecoin_vault.key() == presale.usdt_vault
            || stablecoin_vault.key() == presale.pyusd_vault
        ) @ PresaleError::UnsupportedStablecoin,
    )]
    pub stablecoin_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = authority_stablecoin_account.owner == authority.key()
            @ PresaleError::WithdrawDestinationMismatch,
    )]
    pub authority_stablecoin_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawUnsold<'info> {
    #[account(has_one = authority)]
    pub presale: Account<'info, PresaleState>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_auth", presale.token_mint.as_ref()], bump = presale.vault_bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut, constraint = token_vault.key() == presale.token_vault)]
    pub token_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = authority_token_account.owner == authority.key()
            @ PresaleError::WithdrawDestinationMismatch,
    )]
    pub authority_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClosePresale<'info> {
    #[account(
        mut,
        has_one = authority,
        close = authority,
        constraint = Clock::get()?.unix_timestamp > presale.end_time @ PresaleError::NotEnded,
    )]
    pub presale: Account<'info, PresaleState>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

// ── STATE ──

#[account]
#[derive(InitSpace)]
pub struct PresaleState {
    pub authority: Pubkey,              // 32
    pub token_mint: Pubkey,             // 32
    pub token_vault: Pubkey,            // 32
    pub sol_vault: Pubkey,              // 32
    pub usdc_vault: Pubkey,             // 32
    pub usdc_mint: Pubkey,              // 32
    pub usdt_vault: Pubkey,             // 32
    pub usdt_mint: Pubkey,              // 32
    pub pyusd_vault: Pubkey,            // 32
    pub pyusd_mint: Pubkey,             // 32
    pub sol_price_lamports: u64,        // 8  — admin-set SOL price per token
    pub min_purchase_lamports: u64,     // 8  — minimum SOL purchase ($250 equiv)
    pub max_per_wallet: u64,            // 8
    pub max_raise_lamports: u64,        // 8  — hard cap on SOL raise
    pub max_raise_stablecoin: u64,      // 8  — hard cap on stablecoin raise (6 dec)
    pub tokens_sold: u64,               // 8
    pub total_raised_sol: u64,          // 8
    pub total_raised_stablecoin: u64,   // 8  — all stablecoins combined (6 dec)
    pub start_time: i64,                // 8
    pub end_time: i64,                  // 8
    pub is_active: bool,                // 1
    pub vault_bump: u8,                 // 1
}

#[account]
#[derive(InitSpace)]
pub struct BuyerRecord {
    pub buyer: Pubkey,                  // 32
    pub total_purchased: u64,           // 8
    pub init_magic: u64,                // 8  — reinitialization guard
}

// ── EVENTS ──

#[event]
pub struct PresaleInitialized {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub sol_price_lamports: u64,
    pub min_purchase_lamports: u64,
    pub max_per_wallet: u64,
    pub max_raise_lamports: u64,
    pub max_raise_stablecoin: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub timestamp: i64,
}

#[event]
pub struct TokensPurchased {
    pub buyer: Pubkey,
    pub amount: u64,
    pub cost: u64,
    pub payment: PaymentMethod,
    pub total_sold: u64,
    pub timestamp: i64,
}

#[event]
pub struct PresaleActivated {
    pub timestamp: i64,
}

#[event]
pub struct PresalePaused {
    pub timestamp: i64,
}

#[event]
pub struct PriceUpdated {
    pub old_price: u64,
    pub new_price: u64,
    pub timestamp: i64,
}

#[event]
pub struct FundsWithdrawn {
    pub amount: u64,
    pub asset: WithdrawAsset,
    pub timestamp: i64,
}

#[event]
pub struct PresaleClosed {
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum PaymentMethod {
    Sol,
    Usdc,
    Usdt,
    Pyusd,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum WithdrawAsset {
    Sol,
    Stablecoin,
    UnsoldTokens,
}

// ── ERRORS ──

#[error_code]
pub enum PresaleError {
    #[msg("Presale is not active")]
    NotActive,
    #[msg("Presale is already active")]
    AlreadyActive,
    #[msg("Presale has not started yet")]
    NotStarted,
    #[msg("Presale has ended")]
    Ended,
    #[msg("Presale has not ended yet")]
    NotEnded,
    #[msg("All presale tokens have been sold")]
    SoldOut,
    #[msg("Purchase exceeds per-wallet limit")]
    ExceedsWalletLimit,
    #[msg("Minimum presale purchase is $250 in stablecoin")]
    BelowMinimum,
    #[msg("SOL purchase below $250 minimum equivalent")]
    BelowMinimumSol,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Price below floor of $0.005 per token")]
    BelowFloorPrice,
    #[msg("Hard cap on SOL raise reached")]
    HardCapReached,
    #[msg("Hard cap on stablecoin raise reached")]
    StablecoinCapReached,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Unsupported stablecoin — only USDC, USDT, PYUSD accepted")]
    UnsupportedStablecoin,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("start_time must be before end_time")]
    InvalidTimeRange,
    #[msg("max_per_wallet must be greater than zero")]
    InvalidWalletLimit,
    #[msg("Buyer record does not match signer")]
    BuyerMismatch,
    #[msg("Vault mint does not match expected mint")]
    VaultMintMismatch,
    #[msg("Vault authority does not match PDA")]
    VaultAuthorityMismatch,
    #[msg("Presale must be ended or paused before withdrawal")]
    PresaleNotEnded,
    #[msg("SOL vault must be an empty system account")]
    InvalidSolVault,
    #[msg("Withdraw destination must be owned by authority")]
    WithdrawDestinationMismatch,
}
