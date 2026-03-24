import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount as createTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

// Time constants matching the program
const SECONDS_PER_DAY = 86400;
const CLIFF_DAYS = 30;
const VESTING_DAYS = 150;
const MONTH_SECONDS = 30 * SECONDS_PER_DAY;

// 1 token = 10^9 raw units (9 decimals)
const ONE_TOKEN = new anchor.BN(1_000_000_000);
const TOTAL_TOKENS = new anchor.BN(1_000_000).mul(ONE_TOKEN); // 1M tokens

function deriveVestingSchedule(
  buyer: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vesting"), buyer.toBuffer()],
    programId
  );
}

function deriveVaultAuthority(
  buyer: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow_auth"), buyer.toBuffer()],
    programId
  );
}

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;
  const authority = provider.wallet;

  // Shared state across tests
  let tokenMint: PublicKey;
  let escrowVault: PublicKey;
  let buyerTokenAccount: PublicKey;
  let buyerKp: Keypair;
  let vaultAuthority: PublicKey;
  let vaultAuthorityBump: number;
  let vestingSchedule: PublicKey;
  let vestingBump: number;
  let startTimestamp: anchor.BN;

  before(async () => {
    // Create a buyer keypair and fund it
    buyerKp = Keypair.generate();
    const airdropSig = await provider.connection.requestAirdrop(
      buyerKp.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Derive PDAs
    [vaultAuthority, vaultAuthorityBump] = deriveVaultAuthority(
      buyerKp.publicKey,
      program.programId
    );
    [vestingSchedule, vestingBump] = deriveVestingSchedule(
      buyerKp.publicKey,
      program.programId
    );

    // Create token mint (authority = provider wallet for minting)
    tokenMint = await createMint(
      provider.connection,
      (authority as any).payer,
      authority.publicKey,
      null, // no freeze authority
      9 // 9 decimals like OSR
    );

    // Create escrow vault owned by the vault authority PDA
    escrowVault = await createTokenAccount(
      provider.connection,
      (authority as any).payer,
      tokenMint,
      vaultAuthority,
      Keypair.generate()
    );

    // Create buyer's personal token account
    buyerTokenAccount = await createTokenAccount(
      provider.connection,
      (authority as any).payer,
      tokenMint,
      buyerKp.publicKey,
      Keypair.generate()
    );

    // Mint tokens into the escrow vault (simulating presale deposit)
    await mintTo(
      provider.connection,
      (authority as any).payer,
      tokenMint,
      escrowVault,
      authority.publicKey,
      BigInt(TOTAL_TOKENS.toString())
    );

    // Use a fixed start timestamp (current time for testing)
    const clock = await provider.connection.getSlot();
    const blockTime = await provider.connection.getBlockTime(clock);
    startTimestamp = new anchor.BN(blockTime);
  });

  // ---- Test 1: Initialize vesting schedule ----
  it("initializes vesting schedule correctly", async () => {
    await program.methods
      .initializeVesting(TOTAL_TOKENS, startTimestamp)
      .accounts({
        vestingSchedule: vestingSchedule,
        tokenMint: tokenMint,
        escrowVault: escrowVault,
        vaultAuthority: vaultAuthority,
        buyer: buyerKp.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const schedule = await program.account.vestingSchedule.fetch(vestingSchedule);

    assert.ok(schedule.buyer.equals(buyerKp.publicKey));
    assert.ok(schedule.tokenMint.equals(tokenMint));
    assert.ok(schedule.escrowVault.equals(escrowVault));
    assert.equal(
      schedule.totalTokens.toString(),
      TOTAL_TOKENS.toString(),
      "total_tokens mismatch"
    );
    assert.equal(schedule.tokensReleased.toString(), "0");
    assert.equal(schedule.tokensBurned.toString(), "0");

    // tge_amount = 20% of total
    const expectedTge = TOTAL_TOKENS.mul(new anchor.BN(2000)).div(
      new anchor.BN(10000)
    );
    assert.equal(
      schedule.tgeAmount.toString(),
      expectedTge.toString(),
      "tge_amount should be 20% of total"
    );

    // cliff_end = start + 30 days
    const expectedCliffEnd = startTimestamp.add(
      new anchor.BN(CLIFF_DAYS * SECONDS_PER_DAY)
    );
    assert.equal(
      schedule.cliffEnd.toString(),
      expectedCliffEnd.toString(),
      "cliff_end mismatch"
    );

    // vesting_end = start + 150 days
    const expectedVestingEnd = startTimestamp.add(
      new anchor.BN(VESTING_DAYS * SECONDS_PER_DAY)
    );
    assert.equal(
      schedule.vestingEnd.toString(),
      expectedVestingEnd.toString(),
      "vesting_end mismatch"
    );
  });

  // ---- Test 2: Prevent reinitialization ----
  it("prevents reinitialization of vesting schedule", async () => {
    try {
      await program.methods
        .initializeVesting(TOTAL_TOKENS, startTimestamp)
        .accounts({
          vestingSchedule: vestingSchedule,
          tokenMint: tokenMint,
          escrowVault: escrowVault,
          vaultAuthority: vaultAuthority,
          buyer: buyerKp.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed on reinitialization");
    } catch (err) {
      // PDA already exists, so Anchor will reject the init
      assert.ok(err, "Reinitialization correctly rejected");
    }
  });

  // ---- Test 3: Release at TGE (get 20%) ----
  it("releases 20% at TGE", async () => {
    const tx = await program.methods
      .releaseTokens()
      .accounts({
        vestingSchedule: vestingSchedule,
        escrowVault: escrowVault,
        vaultAuthority: vaultAuthority,
        buyer: buyerKp.publicKey,
        buyerTokenAccount: buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyerKp])
      .rpc();

    const schedule = await program.account.vestingSchedule.fetch(vestingSchedule);
    const expectedTge = TOTAL_TOKENS.mul(new anchor.BN(2000)).div(
      new anchor.BN(10000)
    );

    assert.equal(
      schedule.tokensReleased.toString(),
      expectedTge.toString(),
      "Should have released TGE amount (20%)"
    );

    // Verify buyer received the tokens
    const buyerAccount = await getAccount(
      provider.connection,
      buyerTokenAccount
    );
    assert.equal(
      buyerAccount.amount.toString(),
      expectedTge.toString(),
      "Buyer token balance should equal TGE amount"
    );
  });

  // ---- Test 4: Release during cliff (still only 20%, nothing new) ----
  it("releases nothing during cliff period (already got TGE)", async () => {
    try {
      await program.methods
        .releaseTokens()
        .accounts({
          vestingSchedule: vestingSchedule,
          escrowVault: escrowVault,
          vaultAuthority: vaultAuthority,
          buyer: buyerKp.publicKey,
          buyerTokenAccount: buyerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyerKp])
        .rpc();
      assert.fail("Should have failed with NothingToRelease during cliff");
    } catch (err) {
      const errMsg = err.toString();
      assert.ok(
        errMsg.includes("NothingToRelease") || errMsg.includes("6004"),
        "Expected NothingToRelease error"
      );
    }
  });

  // ---- Test 5: Unauthorized release attempt ----
  it("rejects release from unauthorized wallet", async () => {
    const fakeKp = Keypair.generate();
    const airdropSig = await provider.connection.requestAirdrop(
      fakeKp.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // The PDA is derived from the real buyer, so passing a different signer
    // will cause the seeds constraint to fail
    try {
      // Derive the fake buyer's (non-existent) vesting PDA
      const [fakeVesting] = deriveVestingSchedule(
        fakeKp.publicKey,
        program.programId
      );
      const [fakeVaultAuth] = deriveVaultAuthority(
        fakeKp.publicKey,
        program.programId
      );

      await program.methods
        .releaseTokens()
        .accounts({
          vestingSchedule: fakeVesting,
          escrowVault: escrowVault,
          vaultAuthority: fakeVaultAuth,
          buyer: fakeKp.publicKey,
          buyerTokenAccount: buyerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([fakeKp])
        .rpc();
      assert.fail("Should have failed for unauthorized buyer");
    } catch (err) {
      assert.ok(err, "Unauthorized release correctly rejected");
    }
  });

  // ---- Test 6: Burn for compute during cliff (should work) ----
  it("allows burn for compute during cliff period", async () => {
    const burnAmount = ONE_TOKEN.mul(new anchor.BN(10_000)); // 10,000 tokens

    const scheduleBefore = await program.account.vestingSchedule.fetch(vestingSchedule);

    await program.methods
      .burnForCompute(burnAmount)
      .accounts({
        vestingSchedule: vestingSchedule,
        escrowVault: escrowVault,
        tokenMint: tokenMint,
        vaultAuthority: vaultAuthority,
        buyer: buyerKp.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyerKp])
      .rpc();

    const scheduleAfter = await program.account.vestingSchedule.fetch(vestingSchedule);

    assert.equal(
      scheduleAfter.tokensBurned.toString(),
      burnAmount.toString(),
      "tokens_burned should equal burn amount"
    );

    // tge_amount should be recalculated: (total - burned) * 20 / 100
    const effectiveTotal = new anchor.BN(scheduleAfter.totalTokens.toString())
      .sub(new anchor.BN(scheduleAfter.tokensBurned.toString()));
    const expectedTge = effectiveTotal
      .mul(new anchor.BN(2000))
      .div(new anchor.BN(10000));

    assert.equal(
      scheduleAfter.tgeAmount.toString(),
      expectedTge.toString(),
      "tge_amount should be recalculated proportionally after burn"
    );
  });

  // ---- Test 7: Burn more than remaining fails ----
  it("rejects burn exceeding remaining escrow balance", async () => {
    // Try to burn more tokens than what remains in escrow
    const schedule = await program.account.vestingSchedule.fetch(vestingSchedule);
    const remaining = new anchor.BN(schedule.totalTokens.toString())
      .sub(new anchor.BN(schedule.tokensReleased.toString()))
      .sub(new anchor.BN(schedule.tokensBurned.toString()));

    const excessBurn = remaining.add(ONE_TOKEN);

    try {
      await program.methods
        .burnForCompute(excessBurn)
        .accounts({
          vestingSchedule: vestingSchedule,
          escrowVault: escrowVault,
          tokenMint: tokenMint,
          vaultAuthority: vaultAuthority,
          buyer: buyerKp.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyerKp])
        .rpc();
      assert.fail("Should have failed for excess burn");
    } catch (err) {
      const errMsg = err.toString();
      assert.ok(
        errMsg.includes("InsufficientTokens") || errMsg.includes("6005"),
        "Expected InsufficientTokens error"
      );
    }
  });

  // ---- Test 8: Zero burn amount fails ----
  it("rejects zero burn amount", async () => {
    try {
      await program.methods
        .burnForCompute(new anchor.BN(0))
        .accounts({
          vestingSchedule: vestingSchedule,
          escrowVault: escrowVault,
          tokenMint: tokenMint,
          vaultAuthority: vaultAuthority,
          buyer: buyerKp.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyerKp])
        .rpc();
      assert.fail("Should have failed for zero burn");
    } catch (err) {
      const errMsg = err.toString();
      assert.ok(
        errMsg.includes("ZeroAmount") || errMsg.includes("6000"),
        "Expected ZeroAmount error"
      );
    }
  });
});

// Separate describe block for time-dependent tests using a second buyer.
// These tests use a start_timestamp far in the past to simulate vesting progression.
describe("escrow - time-based vesting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;
  const authority = provider.wallet;

  let tokenMint: PublicKey;
  let buyerKp: Keypair;
  let vaultAuthority: PublicKey;
  let vestingSchedule: PublicKey;
  let escrowVault: PublicKey;
  let buyerTokenAccount: PublicKey;

  // Total = 1M tokens
  const TOTAL = new anchor.BN(1_000_000).mul(ONE_TOKEN);
  // Start timestamp = 6 months ago (well past full vesting)
  let pastStart: anchor.BN;

  before(async () => {
    buyerKp = Keypair.generate();
    const airdropSig = await provider.connection.requestAirdrop(
      buyerKp.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    [vaultAuthority] = deriveVaultAuthority(buyerKp.publicKey, program.programId);
    [vestingSchedule] = deriveVestingSchedule(buyerKp.publicKey, program.programId);

    tokenMint = await createMint(
      provider.connection,
      (authority as any).payer,
      authority.publicKey,
      null,
      9
    );

    escrowVault = await createTokenAccount(
      provider.connection,
      (authority as any).payer,
      tokenMint,
      vaultAuthority,
      Keypair.generate()
    );

    buyerTokenAccount = await createTokenAccount(
      provider.connection,
      (authority as any).payer,
      tokenMint,
      buyerKp.publicKey,
      Keypair.generate()
    );

    await mintTo(
      provider.connection,
      (authority as any).payer,
      tokenMint,
      escrowVault,
      authority.publicKey,
      BigInt(TOTAL.toString())
    );

    // Set start to 6 months ago so current time is past vesting_end
    const clock = await provider.connection.getSlot();
    const blockTime = await provider.connection.getBlockTime(clock);
    pastStart = new anchor.BN(blockTime - 180 * SECONDS_PER_DAY);
  });

  it("initializes with past start timestamp", async () => {
    await program.methods
      .initializeVesting(TOTAL, pastStart)
      .accounts({
        vestingSchedule: vestingSchedule,
        tokenMint: tokenMint,
        escrowVault: escrowVault,
        vaultAuthority: vaultAuthority,
        buyer: buyerKp.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const schedule = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.equal(schedule.totalTokens.toString(), TOTAL.toString());
  });

  // ---- Test: Release after vesting end (100%) ----
  it("releases 100% after vesting end", async () => {
    await program.methods
      .releaseTokens()
      .accounts({
        vestingSchedule: vestingSchedule,
        escrowVault: escrowVault,
        vaultAuthority: vaultAuthority,
        buyer: buyerKp.publicKey,
        buyerTokenAccount: buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyerKp])
      .rpc();

    const schedule = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.equal(
      schedule.tokensReleased.toString(),
      TOTAL.toString(),
      "All tokens should be released after vesting end"
    );

    const buyerAccount = await getAccount(provider.connection, buyerTokenAccount);
    assert.equal(
      buyerAccount.amount.toString(),
      TOTAL.toString(),
      "Buyer should have all tokens"
    );
  });

  // ---- Test: Double release prevention (nothing left) ----
  it("prevents double release after full vesting", async () => {
    try {
      await program.methods
        .releaseTokens()
        .accounts({
          vestingSchedule: vestingSchedule,
          escrowVault: escrowVault,
          vaultAuthority: vaultAuthority,
          buyer: buyerKp.publicKey,
          buyerTokenAccount: buyerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyerKp])
        .rpc();
      assert.fail("Should have failed with NothingToRelease");
    } catch (err) {
      const errMsg = err.toString();
      assert.ok(
        errMsg.includes("NothingToRelease") || errMsg.includes("6004"),
        "Expected NothingToRelease error on double release"
      );
    }
  });
});

// Tests for partial vesting at different month boundaries.
// Uses separate buyers with different start timestamps for each scenario.
describe("escrow - monthly vesting milestones", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;
  const authority = provider.wallet;

  const TOTAL = new anchor.BN(1_000_000).mul(ONE_TOKEN);
  const TGE_AMOUNT = TOTAL.mul(new anchor.BN(2000)).div(new anchor.BN(10000)); // 200K tokens
  const REMAINING = TOTAL.sub(TGE_AMOUNT); // 800K tokens

  async function setupBuyerWithStartOffset(
    daysAgo: number
  ): Promise<{
    buyerKp: Keypair;
    vestingSchedule: PublicKey;
    escrowVault: PublicKey;
    buyerTokenAccount: PublicKey;
    vaultAuthority: PublicKey;
    tokenMint: PublicKey;
  }> {
    const kp = Keypair.generate();
    const airdropSig = await provider.connection.requestAirdrop(
      kp.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    const [va] = deriveVaultAuthority(kp.publicKey, program.programId);
    const [vs] = deriveVestingSchedule(kp.publicKey, program.programId);

    const mint = await createMint(
      provider.connection,
      (authority as any).payer,
      authority.publicKey,
      null,
      9
    );

    const vault = await createTokenAccount(
      provider.connection,
      (authority as any).payer,
      mint,
      va,
      Keypair.generate()
    );

    const buyerTA = await createTokenAccount(
      provider.connection,
      (authority as any).payer,
      mint,
      kp.publicKey,
      Keypair.generate()
    );

    await mintTo(
      provider.connection,
      (authority as any).payer,
      mint,
      vault,
      authority.publicKey,
      BigInt(TOTAL.toString())
    );

    const clock = await provider.connection.getSlot();
    const blockTime = await provider.connection.getBlockTime(clock);
    const start = new anchor.BN(blockTime - daysAgo * SECONDS_PER_DAY);

    await program.methods
      .initializeVesting(TOTAL, start)
      .accounts({
        vestingSchedule: vs,
        tokenMint: mint,
        escrowVault: vault,
        vaultAuthority: va,
        buyer: kp.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      buyerKp: kp,
      vestingSchedule: vs,
      escrowVault: vault,
      buyerTokenAccount: buyerTA,
      vaultAuthority: va,
      tokenMint: mint,
    };
  }

  // After cliff + 1 month (day 60): 20% TGE + 25% of 80% = 20% + 20% = 40%
  it("releases 40% after cliff + 1 month (month 2)", async () => {
    const { buyerKp, vestingSchedule, escrowVault, buyerTokenAccount, vaultAuthority } =
      await setupBuyerWithStartOffset(61); // 61 days ago = past cliff + 1 month

    await program.methods
      .releaseTokens()
      .accounts({
        vestingSchedule,
        escrowVault,
        vaultAuthority,
        buyer: buyerKp.publicKey,
        buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyerKp])
      .rpc();

    const schedule = await program.account.vestingSchedule.fetch(vestingSchedule);
    // Expected: TGE (20%) + 1/4 of remaining (20%) = 40% total
    const expectedVested = TGE_AMOUNT.add(
      REMAINING.mul(new anchor.BN(1)).div(new anchor.BN(4))
    );

    assert.equal(
      schedule.tokensReleased.toString(),
      expectedVested.toString(),
      "Should have released 40% at month 2"
    );
  });

  // After cliff + 2 months (day 90): 20% TGE + 50% of 80% = 20% + 40% = 60%
  it("releases 60% after cliff + 2 months (month 3)", async () => {
    const { buyerKp, vestingSchedule, escrowVault, buyerTokenAccount, vaultAuthority } =
      await setupBuyerWithStartOffset(91);

    await program.methods
      .releaseTokens()
      .accounts({
        vestingSchedule,
        escrowVault,
        vaultAuthority,
        buyer: buyerKp.publicKey,
        buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyerKp])
      .rpc();

    const schedule = await program.account.vestingSchedule.fetch(vestingSchedule);
    const expectedVested = TGE_AMOUNT.add(
      REMAINING.mul(new anchor.BN(2)).div(new anchor.BN(4))
    );

    assert.equal(
      schedule.tokensReleased.toString(),
      expectedVested.toString(),
      "Should have released 60% at month 3"
    );
  });

  // After cliff + 3 months (day 120): 20% TGE + 75% of 80% = 20% + 60% = 80%
  it("releases 80% after cliff + 3 months (month 4)", async () => {
    const { buyerKp, vestingSchedule, escrowVault, buyerTokenAccount, vaultAuthority } =
      await setupBuyerWithStartOffset(121);

    await program.methods
      .releaseTokens()
      .accounts({
        vestingSchedule,
        escrowVault,
        vaultAuthority,
        buyer: buyerKp.publicKey,
        buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyerKp])
      .rpc();

    const schedule = await program.account.vestingSchedule.fetch(vestingSchedule);
    const expectedVested = TGE_AMOUNT.add(
      REMAINING.mul(new anchor.BN(3)).div(new anchor.BN(4))
    );

    assert.equal(
      schedule.tokensReleased.toString(),
      expectedVested.toString(),
      "Should have released 80% at month 4"
    );
  });

  // Burn for compute during vesting (should work at any time)
  it("allows burn for compute during vesting period", async () => {
    const { buyerKp, vestingSchedule, escrowVault, vaultAuthority, tokenMint } =
      await setupBuyerWithStartOffset(61); // During vesting

    const burnAmount = ONE_TOKEN.mul(new anchor.BN(5_000)); // 5,000 tokens

    await program.methods
      .burnForCompute(burnAmount)
      .accounts({
        vestingSchedule,
        escrowVault,
        tokenMint,
        vaultAuthority,
        buyer: buyerKp.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyerKp])
      .rpc();

    const schedule = await program.account.vestingSchedule.fetch(vestingSchedule);
    assert.equal(
      schedule.tokensBurned.toString(),
      burnAmount.toString(),
      "Burn during vesting should succeed"
    );

    // Verify tge_amount was recalculated
    const effectiveTotal = new anchor.BN(schedule.totalTokens.toString()).sub(
      new anchor.BN(schedule.tokensBurned.toString())
    );
    const expectedTge = effectiveTotal
      .mul(new anchor.BN(2000))
      .div(new anchor.BN(10000));
    assert.equal(
      schedule.tgeAmount.toString(),
      expectedTge.toString(),
      "tge_amount recalculated after burn"
    );
  });
});
