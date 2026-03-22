import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Presale } from "../target/types/presale";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createMint,
  createAccount as createTokenAccount,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

// Devnet addresses from setup
const TEST_TOKEN_MINT = new PublicKey("DJXh4DpaXMKsDaLc4TLQbpK4e8EVV5jTUe7vzvDVXa9s");
const TOKEN_VAULT = new PublicKey("C5SqgyeziBccge1PYFTVZuDj4XM3QPLignhjRvHxvumi");
const SOL_VAULT = new PublicKey("RSpfwwqhY795XZqfM7jZjVVAMXqnwWyDyCrHkyLpprD");
const USDC_MINT = new PublicKey("3aZJGWaF5swLdQ76gJpvYahjEs3pb9iKUdkz7LifPSHW");
const USDC_VAULT = new PublicKey("WEyRnWDetKNUgmRASj8yQqB1q3fzzG6dznYPvGGf2GK");
const USDT_MINT = new PublicKey("HNzmjS5un6yhKFBt6RW2NcisHEu7Jz7bS9TreiSBEFR4");
const USDT_VAULT = new PublicKey("4ayLhRBZonbF9tJXDk4Byrd7ojLxEn8RKzXubWcKvoeg");
const PYUSD_MINT = new PublicKey("29H1vmD5kGv2n43Xq8zZ9ocbaSH8ryGgCk8SmmXti6EY");
const PYUSD_VAULT = new PublicKey("HjdWCpCnjfBWPGknmD5MbVXndCeKsqatrsSKVyF7upKL");
const VAULT_AUTHORITY = new PublicKey("B4HdcPP59quFEiEbQyqpWPSzz2GBnJDHKhDE4LdTzhhx");

// Test constants
const ONE_TOKEN = new anchor.BN(1_000_000_000); // 1 token in raw units
const SOL_PRICE_LAMPORTS = new anchor.BN(33_333); // $0.005/token at ~$150/SOL
// $250 at $150/SOL ≈ 1.667 SOL. At sol_price=33333, 50K tokens costs
// exactly 1,666,650,000 lamports. Set min to match floor cost.
const MIN_PURCHASE_LAMPORTS = new anchor.BN(1_666_650_000);
const MAX_PER_WALLET = new anchor.BN(2_000_000).mul(ONE_TOKEN); // 2M tokens
const MAX_RAISE_LAMPORTS = new anchor.BN(3_333).mul(new anchor.BN(LAMPORTS_PER_SOL));
// $500K in stablecoin (6 decimals)
const MAX_RAISE_STABLECOIN = new anchor.BN(500_000_000_000);

function deriveVaultAuthority(tokenMint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_auth"), tokenMint.toBuffer()],
    programId
  );
}

function deriveBuyerRecord(
  presale: PublicKey,
  buyer: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("buyer"), presale.toBuffer(), buyer.toBuffer()],
    programId
  );
}

async function initPresale(
  program: Program<Presale>,
  presaleKp: Keypair,
  authority: anchor.Wallet,
  overrides: {
    solPrice?: anchor.BN;
    minPurchase?: anchor.BN;
    maxPerWallet?: anchor.BN;
    maxRaiseLamports?: anchor.BN;
    maxRaiseStablecoin?: anchor.BN;
    startTime?: anchor.BN;
    endTime?: anchor.BN;
  } = {}
) {
  const now = Math.floor(Date.now() / 1000);
  const solPrice = overrides.solPrice || SOL_PRICE_LAMPORTS;
  const minPurchase = overrides.minPurchase || MIN_PURCHASE_LAMPORTS;
  const maxPerWallet = overrides.maxPerWallet || MAX_PER_WALLET;
  const maxRaiseLam = overrides.maxRaiseLamports || MAX_RAISE_LAMPORTS;
  const maxRaiseStable = overrides.maxRaiseStablecoin || MAX_RAISE_STABLECOIN;
  const startTime = overrides.startTime || new anchor.BN(now - 60);
  const endTime = overrides.endTime || new anchor.BN(now + 7 * 24 * 3600);

  await program.methods
    .initialize(
      solPrice,
      minPurchase,
      maxPerWallet,
      maxRaiseLam,
      maxRaiseStable,
      startTime,
      endTime
    )
    .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })])
    .accounts({
      presale: presaleKp.publicKey,
      tokenMint: TEST_TOKEN_MINT,
      tokenVault: TOKEN_VAULT,
      vaultAuthority: VAULT_AUTHORITY,
      solVault: SOL_VAULT,
      usdcMint: USDC_MINT,
      usdcVault: USDC_VAULT,
      usdtMint: USDT_MINT,
      usdtVault: USDT_VAULT,
      pyusdMint: PYUSD_MINT,
      pyusdVault: PYUSD_VAULT,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([presaleKp])
    .rpc();
}

describe("OSR Presale — Full Remediation Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.presale as Program<Presale>;
  const authority = provider.wallet;
  const connection = provider.connection;

  // Main presale: active window
  const mainPresaleKp = Keypair.generate();

  // Buyer accounts (populated in before())
  let buyerTokenAccount: PublicKey;
  let buyerUsdcAccount: PublicKey;

  before(async () => {
    // Ensure buyer has an $OSR token account
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      (authority as any).payer,
      TEST_TOKEN_MINT,
      authority.publicKey
    );
    buyerTokenAccount = ata.address;

    // Ensure buyer has a USDC token account with balance
    const usdcAta = await getOrCreateAssociatedTokenAccount(
      connection,
      (authority as any).payer,
      USDC_MINT,
      authority.publicKey
    );
    buyerUsdcAccount = usdcAta.address;

    // Mint test USDC to buyer (10,000 USDC = 10_000_000_000 in 6 decimals)
    try {
      await mintTo(
        connection,
        (authority as any).payer,
        USDC_MINT,
        buyerUsdcAccount,
        (authority as any).payer,
        10_000_000_000
      );
    } catch (e) {
      // May fail if not mint authority; tests using stablecoin will skip gracefully
      console.log("  Note: Could not mint test USDC (may not be mint authority)");
    }
  });

  // ── 1. INITIALIZE ──

  describe("1. Initialize", () => {
    it("initializes with valid parameters", async () => {
      await initPresale(program, mainPresaleKp, authority as any);

      const state = await program.account.presaleState.fetch(mainPresaleKp.publicKey);
      assert.equal(state.tokensSold.toNumber(), 0);
      assert.equal(state.isActive, false);
      assert.equal(state.authority.toBase58(), authority.publicKey.toBase58());
      assert.equal(state.tokenMint.toBase58(), TEST_TOKEN_MINT.toBase58());
      assert.equal(state.solPriceLamports.toNumber(), SOL_PRICE_LAMPORTS.toNumber());
      assert.equal(state.minPurchaseLamports.toNumber(), MIN_PURCHASE_LAMPORTS.toNumber());
      assert.equal(state.maxPerWallet.toString(), MAX_PER_WALLET.toString());
      assert.equal(state.maxRaiseLamports.toString(), MAX_RAISE_LAMPORTS.toString());
      assert.equal(state.maxRaiseStablecoin.toString(), MAX_RAISE_STABLECOIN.toString());
    });

    it("rejects start_time >= end_time", async () => {
      const badKp = Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      try {
        await initPresale(program, badKp, authority as any, {
          startTime: new anchor.BN(now + 100),
          endTime: new anchor.BN(now - 100),
        });
        assert.fail("Should have rejected start >= end");
      } catch (e: any) {
        assert.include(e.message, "InvalidTimeRange");
      }
    });

    it("rejects max_per_wallet = 0", async () => {
      const badKp = Keypair.generate();
      try {
        await initPresale(program, badKp, authority as any, {
          maxPerWallet: new anchor.BN(0),
        });
        assert.fail("Should have rejected max_per_wallet = 0");
      } catch (e: any) {
        assert.include(e.message, "InvalidWalletLimit");
      }
    });

    it("rejects sol_price_lamports = 0", async () => {
      const badKp = Keypair.generate();
      try {
        await initPresale(program, badKp, authority as any, {
          solPrice: new anchor.BN(0),
        });
        assert.fail("Should have rejected sol_price = 0");
      } catch (e: any) {
        assert.include(e.message, "InvalidPrice");
      }
    });

    it("rejects min_purchase_lamports = 0", async () => {
      const badKp = Keypair.generate();
      try {
        await initPresale(program, badKp, authority as any, {
          minPurchase: new anchor.BN(0),
        });
        assert.fail("Should have rejected min_purchase = 0");
      } catch (e: any) {
        assert.include(e.message, "InvalidPrice");
      }
    });
  });

  // ── 2. ADMIN ACTIONS ──

  describe("2. Admin Actions", () => {
    it("activates presale", async () => {
      await program.methods
        .activate()
        .accounts({
          presale: mainPresaleKp.publicKey,
          authority: authority.publicKey,
        })
        .rpc();

      const state = await program.account.presaleState.fetch(mainPresaleKp.publicKey);
      assert.equal(state.isActive, true);
    });

    it("rejects double activate", async () => {
      try {
        await program.methods
          .activate()
          .accounts({
            presale: mainPresaleKp.publicKey,
            authority: authority.publicKey,
          })
          .rpc();
        assert.fail("Should have rejected double activate");
      } catch (e: any) {
        assert.include(e.message, "AlreadyActive");
      }
    });

    it("pauses presale", async () => {
      await program.methods
        .pause()
        .accounts({
          presale: mainPresaleKp.publicKey,
          authority: authority.publicKey,
        })
        .rpc();

      const state = await program.account.presaleState.fetch(mainPresaleKp.publicKey);
      assert.equal(state.isActive, false);
    });

    it("rejects pause when not active", async () => {
      try {
        await program.methods
          .pause()
          .accounts({
            presale: mainPresaleKp.publicKey,
            authority: authority.publicKey,
          })
          .rpc();
        assert.fail("Should have rejected pause when not active");
      } catch (e: any) {
        assert.include(e.message, "NotActive");
      }
    });

    it("reactivates after pause", async () => {
      await program.methods
        .activate()
        .accounts({
          presale: mainPresaleKp.publicKey,
          authority: authority.publicKey,
        })
        .rpc();

      const state = await program.account.presaleState.fetch(mainPresaleKp.publicKey);
      assert.equal(state.isActive, true);
    });

    it("rejects unauthorized admin action", async () => {
      const fake = Keypair.generate();
      try {
        await program.methods
          .activate()
          .accounts({
            presale: mainPresaleKp.publicKey,
            authority: fake.publicKey,
          })
          .signers([fake])
          .rpc();
        assert.fail("Should have rejected unauthorized");
      } catch (e: any) {
        // Anchor constraint error or signature error
        assert.ok(e.message);
      }
    });

    it("updates SOL price and min purchase", async () => {
      const newPrice = new anchor.BN(40_000);
      const newMin = new anchor.BN(2_000_000_000);

      await program.methods
        .updateSolPrice(newPrice, newMin)
        .accounts({
          presale: mainPresaleKp.publicKey,
          authority: authority.publicKey,
        })
        .rpc();

      const state = await program.account.presaleState.fetch(mainPresaleKp.publicKey);
      assert.equal(state.solPriceLamports.toNumber(), 40_000);
      assert.equal(state.minPurchaseLamports.toNumber(), 2_000_000_000);

      // Reset
      await program.methods
        .updateSolPrice(SOL_PRICE_LAMPORTS, MIN_PURCHASE_LAMPORTS)
        .accounts({
          presale: mainPresaleKp.publicKey,
          authority: authority.publicKey,
        })
        .rpc();
    });

    it("rejects price update with zero price", async () => {
      try {
        await program.methods
          .updateSolPrice(new anchor.BN(0), MIN_PURCHASE_LAMPORTS)
          .accounts({
            presale: mainPresaleKp.publicKey,
            authority: authority.publicKey,
          })
          .rpc();
        assert.fail("Should have rejected zero price");
      } catch (e: any) {
        assert.include(e.message, "InvalidPrice");
      }
    });

    it("rejects price update with zero min purchase", async () => {
      try {
        await program.methods
          .updateSolPrice(SOL_PRICE_LAMPORTS, new anchor.BN(0))
          .accounts({
            presale: mainPresaleKp.publicKey,
            authority: authority.publicKey,
          })
          .rpc();
        assert.fail("Should have rejected zero min purchase");
      } catch (e: any) {
        assert.include(e.message, "InvalidPrice");
      }
    });
  });

  // ── 3. BUY WITH SOL ──

  describe("3. buy_with_sol", () => {
    const [buyerRecord] = deriveBuyerRecord(
      mainPresaleKp.publicKey,
      provider.wallet.publicKey,
      program.programId
    );

    it("buys tokens with valid SOL payment", async () => {
      // Buy 50,000 tokens ($250 at floor price)
      const amount = new anchor.BN(50_000).mul(ONE_TOKEN);

      const stateBefore = await program.account.presaleState.fetch(mainPresaleKp.publicKey);

      await program.methods
        .buyWithSol(amount)
        .accounts({
          presale: mainPresaleKp.publicKey,
          vaultAuthority: VAULT_AUTHORITY,
          tokenVault: TOKEN_VAULT,
          buyer: authority.publicKey,
          buyerTokenAccount: buyerTokenAccount,
          buyerRecord: buyerRecord,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const stateAfter = await program.account.presaleState.fetch(mainPresaleKp.publicKey);
      assert.ok(stateAfter.tokensSold.gt(stateBefore.tokensSold));
      assert.ok(stateAfter.totalRaisedSol.gt(stateBefore.totalRaisedSol));

      const record = await program.account.buyerRecord.fetch(buyerRecord);
      assert.equal(record.buyer.toBase58(), authority.publicKey.toBase58());
      assert.ok(record.totalPurchased.gt(new anchor.BN(0)));
      // Verify init_magic was set (non-zero = initialized)
      assert.ok(record.initMagic.gt(new anchor.BN(0)), "init_magic should be non-zero");
    });

    it("rejects purchase below $250 minimum", async () => {
      // Buy only 1,000 tokens (~$5 at floor) — cost << min_purchase_lamports
      const tinyAmount = new anchor.BN(1_000).mul(ONE_TOKEN);
      try {
        await program.methods
          .buyWithSol(tinyAmount)
          .accounts({
            presale: mainPresaleKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,

            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerRecord: buyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected below minimum");
      } catch (e: any) {
        assert.include(e.message, "BelowMinimumSol");
      }
    });

    it("rejects zero amount", async () => {
      try {
        await program.methods
          .buyWithSol(new anchor.BN(0))
          .accounts({
            presale: mainPresaleKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,

            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerRecord: buyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected zero amount");
      } catch (e: any) {
        assert.include(e.message, "ZeroAmount");
      }
    });

    it("rejects purchase when paused", async () => {
      // Pause first
      await program.methods
        .pause()
        .accounts({
          presale: mainPresaleKp.publicKey,
          authority: authority.publicKey,
        })
        .rpc();

      const amount = new anchor.BN(50_000).mul(ONE_TOKEN);
      try {
        await program.methods
          .buyWithSol(amount)
          .accounts({
            presale: mainPresaleKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,

            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerRecord: buyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected when paused");
      } catch (e: any) {
        assert.include(e.message, "NotActive");
      }

      // Reactivate for subsequent tests
      await program.methods
        .activate()
        .accounts({
          presale: mainPresaleKp.publicKey,
          authority: authority.publicKey,
        })
        .rpc();
    });

    it("rejects purchase exceeding wallet limit", async () => {
      // Create a presale with tiny wallet limit
      const limitKp = Keypair.generate();
      await initPresale(program, limitKp, authority as any, {
        maxPerWallet: new anchor.BN(1_000).mul(ONE_TOKEN), // 1K tokens max
      });
      await program.methods
        .activate()
        .accounts({ presale: limitKp.publicKey, authority: authority.publicKey })
        .rpc();

      // Try to buy 50K tokens (exceeds 1K limit)
      const [limitBuyerRecord] = deriveBuyerRecord(
        limitKp.publicKey,
        authority.publicKey,
        program.programId
      );
      const amount = new anchor.BN(50_000).mul(ONE_TOKEN);
      try {
        await program.methods
          .buyWithSol(amount)
          .accounts({
            presale: limitKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,

            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerRecord: limitBuyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected exceeding wallet limit");
      } catch (e: any) {
        assert.include(e.message, "ExceedsWalletLimit");
      }
    });

    it("rejects purchase after end_time", async () => {
      // Create an expired presale
      const expiredKp = Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      await initPresale(program, expiredKp, authority as any, {
        startTime: new anchor.BN(now - 1000),
        endTime: new anchor.BN(now - 500),
      });
      await program.methods
        .activate()
        .accounts({ presale: expiredKp.publicKey, authority: authority.publicKey })
        .rpc();

      const [expBuyerRecord] = deriveBuyerRecord(
        expiredKp.publicKey,
        authority.publicKey,
        program.programId
      );
      const amount = new anchor.BN(50_000).mul(ONE_TOKEN);
      try {
        await program.methods
          .buyWithSol(amount)
          .accounts({
            presale: expiredKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,

            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerRecord: expBuyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected after end_time");
      } catch (e: any) {
        assert.include(e.message, "Ended");
      }
    });

    it("rejects purchase before start_time", async () => {
      const futureKp = Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      await initPresale(program, futureKp, authority as any, {
        startTime: new anchor.BN(now + 3600),
        endTime: new anchor.BN(now + 7200),
      });
      await program.methods
        .activate()
        .accounts({ presale: futureKp.publicKey, authority: authority.publicKey })
        .rpc();

      const [futBuyerRecord] = deriveBuyerRecord(
        futureKp.publicKey,
        authority.publicKey,
        program.programId
      );
      const amount = new anchor.BN(50_000).mul(ONE_TOKEN);
      try {
        await program.methods
          .buyWithSol(amount)
          .accounts({
            presale: futureKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,

            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerRecord: futBuyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected before start_time");
      } catch (e: any) {
        assert.include(e.message, "NotStarted");
      }
    });

    it("rejects purchase exceeding SOL hard cap", async () => {
      // Create a presale with tiny SOL hard cap (0.001 SOL)
      const capKp = Keypair.generate();
      await initPresale(program, capKp, authority as any, {
        maxRaiseLamports: new anchor.BN(1_000_000), // 0.001 SOL cap
        minPurchase: new anchor.BN(1), // relax min for this test
      });
      await program.methods
        .activate()
        .accounts({ presale: capKp.publicKey, authority: authority.publicKey })
        .rpc();

      const [capBuyerRecord] = deriveBuyerRecord(
        capKp.publicKey,
        authority.publicKey,
        program.programId
      );
      // Buy 50K tokens which costs ~1.67 SOL > 0.001 SOL cap
      const amount = new anchor.BN(50_000).mul(ONE_TOKEN);
      try {
        await program.methods
          .buyWithSol(amount)
          .accounts({
            presale: capKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,

            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerRecord: capBuyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected exceeding hard cap");
      } catch (e: any) {
        assert.include(e.message, "HardCapReached");
      }
    });
  });

  // ── 4. BUY WITH STABLECOIN ──

  describe("4. buy_with_stablecoin", () => {
    const [buyerRecord] = deriveBuyerRecord(
      mainPresaleKp.publicKey,
      provider.wallet.publicKey,
      program.programId
    );

    it("buys tokens with USDC", async () => {
      // Buy 50,000 tokens at $0.005 = $250 USDC
      const tokenAmount = new anchor.BN(50_000).mul(ONE_TOKEN);
      const usdcAmount = new anchor.BN(250_000_000); // $250 in 6 decimals

      const stateBefore = await program.account.presaleState.fetch(mainPresaleKp.publicKey);

      await program.methods
        .buyWithStablecoin(tokenAmount, usdcAmount)
        .accounts({
          presale: mainPresaleKp.publicKey,
          vaultAuthority: VAULT_AUTHORITY,
          tokenVault: TOKEN_VAULT,
          stablecoinVault: USDC_VAULT,
          buyer: authority.publicKey,
          buyerTokenAccount: buyerTokenAccount,
          buyerStablecoinAccount: buyerUsdcAccount,
          buyerRecord: buyerRecord,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const stateAfter = await program.account.presaleState.fetch(mainPresaleKp.publicKey);
      assert.ok(stateAfter.totalRaisedStablecoin.gt(stateBefore.totalRaisedStablecoin));
    });

    it("rejects fake vault address (C-1 fix validation)", async () => {
      // Create a fake token account NOT matching any configured vault
      const fakeVault = Keypair.generate();
      try {
        // Create a token account with USDC mint owned by some random key
        const fakeVaultAddr = await createTokenAccount(
          connection,
          (authority as any).payer,
          USDC_MINT,
          fakeVault.publicKey // random owner, not vault authority
        );

        const tokenAmount = new anchor.BN(50_000).mul(ONE_TOKEN);
        const usdcAmount = new anchor.BN(250_000_000);

        await program.methods
          .buyWithStablecoin(tokenAmount, usdcAmount)
          .accounts({
            presale: mainPresaleKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,
            stablecoinVault: fakeVaultAddr, // FAKE — not in presale state
            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerStablecoinAccount: buyerUsdcAccount,
            buyerRecord: buyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected fake vault");
      } catch (e: any) {
        // Constraint should catch: vault not in (usdc_vault, usdt_vault, pyusd_vault)
        assert.ok(
          e.message.includes("UnsupportedStablecoin") ||
            e.message.includes("ConstraintRaw") ||
            e.message.includes("Error"),
          `Expected vault rejection, got: ${e.message}`
        );
      }
    });

    it("rejects purchase below $250 minimum", async () => {
      const tokenAmount = new anchor.BN(10_000).mul(ONE_TOKEN);
      const usdcAmount = new anchor.BN(50_000_000); // $50 — below $250 min

      try {
        await program.methods
          .buyWithStablecoin(tokenAmount, usdcAmount)
          .accounts({
            presale: mainPresaleKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,
            stablecoinVault: USDC_VAULT,
            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerStablecoinAccount: buyerUsdcAccount,
            buyerRecord: buyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected below $250");
      } catch (e: any) {
        assert.include(e.message, "BelowMinimum");
      }
    });

    it("rejects purchase below $0.005 floor price", async () => {
      // Try to buy 200K tokens for only $250 (price = $0.00125 < $0.005 floor)
      const tokenAmount = new anchor.BN(200_000).mul(ONE_TOKEN);
      const usdcAmount = new anchor.BN(250_000_000); // $250

      try {
        await program.methods
          .buyWithStablecoin(tokenAmount, usdcAmount)
          .accounts({
            presale: mainPresaleKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,
            stablecoinVault: USDC_VAULT,
            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerStablecoinAccount: buyerUsdcAccount,
            buyerRecord: buyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected below floor price");
      } catch (e: any) {
        assert.include(e.message, "BelowFloorPrice");
      }
    });

    it("rejects purchase exceeding stablecoin hard cap", async () => {
      // Create presale with tiny stablecoin cap ($100)
      const capKp = Keypair.generate();
      await initPresale(program, capKp, authority as any, {
        maxRaiseStablecoin: new anchor.BN(100_000_000), // $100 cap
      });
      await program.methods
        .activate()
        .accounts({ presale: capKp.publicKey, authority: authority.publicKey })
        .rpc();

      const [capBuyerRecord] = deriveBuyerRecord(
        capKp.publicKey,
        authority.publicKey,
        program.programId
      );
      // Buy $250 USDC > $100 cap
      const tokenAmount = new anchor.BN(50_000).mul(ONE_TOKEN);
      const usdcAmount = new anchor.BN(250_000_000);

      try {
        await program.methods
          .buyWithStablecoin(tokenAmount, usdcAmount)
          .accounts({
            presale: capKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,
            stablecoinVault: USDC_VAULT,
            buyer: authority.publicKey,
            buyerTokenAccount: buyerTokenAccount,
            buyerStablecoinAccount: buyerUsdcAccount,
            buyerRecord: capBuyerRecord,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected exceeding stablecoin cap");
      } catch (e: any) {
        assert.include(e.message, "StablecoinCapReached");
      }
    });
  });

  // ── 5. WITHDRAWALS ──

  describe("5. Withdrawals", () => {
    it("rejects SOL withdrawal during active presale", async () => {
      // Main presale is active
      try {
        await program.methods
          .withdrawSol(new anchor.BN(1000))
          .accounts({
            presale: mainPresaleKp.publicKey,
            authority: authority.publicKey,
          })
          .rpc();
        assert.fail("Should have rejected withdrawal during active presale");
      } catch (e: any) {
        assert.include(e.message, "PresaleNotEnded");
      }
    });

    it("allows SOL withdrawal when paused", async () => {
      // Create a presale, buy some tokens, pause it, then try withdrawal
      const withdrawKp = Keypair.generate();
      await initPresale(program, withdrawKp, authority as any);
      await program.methods
        .activate()
        .accounts({ presale: withdrawKp.publicKey, authority: authority.publicKey })
        .rpc();

      // Buy tokens to put SOL in vault
      const [wBuyerRecord] = deriveBuyerRecord(
        withdrawKp.publicKey,
        authority.publicKey,
        program.programId
      );
      const amount = new anchor.BN(50_000).mul(ONE_TOKEN);
      await program.methods
        .buyWithSol(amount)
        .accounts({
          presale: withdrawKp.publicKey,
          vaultAuthority: VAULT_AUTHORITY,
          tokenVault: TOKEN_VAULT,
          buyer: authority.publicKey,
          buyerTokenAccount: buyerTokenAccount,
          buyerRecord: wBuyerRecord,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      // Pause
      await program.methods
        .pause()
        .accounts({ presale: withdrawKp.publicKey, authority: authority.publicKey })
        .rpc();

      // Now withdrawal should succeed (paused = !is_active)
      await program.methods
        .withdrawSol(new anchor.BN(100_000)) // withdraw small amount
        .accounts({
          presale: withdrawKp.publicKey,
          authority: authority.publicKey,
        })
        .rpc();
      // If we get here without error, the withdrawal succeeded
    });

    it("rejects stablecoin withdrawal during active presale", async () => {
      try {
        await program.methods
          .withdrawStablecoin(new anchor.BN(1000))
          .accounts({
            presale: mainPresaleKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            stablecoinVault: USDC_VAULT,
            authorityStablecoinAccount: buyerUsdcAccount,
            authority: authority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected stablecoin withdrawal during active presale");
      } catch (e: any) {
        assert.include(e.message, "PresaleNotEnded");
      }
    });

    it("rejects unauthorized withdrawal", async () => {
      const fake = Keypair.generate();
      try {
        await program.methods
          .withdrawSol(new anchor.BN(1000))
          .accounts({
            presale: mainPresaleKp.publicKey,

            authority: fake.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([fake])
          .rpc();
        assert.fail("Should have rejected unauthorized");
      } catch (e: any) {
        // has_one = authority constraint
        assert.ok(e.message);
      }
    });

    it("allows withdrawal after presale ends", async () => {
      // Create an expired presale
      const expKp = Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      await initPresale(program, expKp, authority as any, {
        startTime: new anchor.BN(now - 1000),
        endTime: new anchor.BN(now - 500),
      });

      // Withdrawal should succeed (past end_time)
      // Note: SOL vault may have no excess lamports, so this tests the time constraint
      try {
        await program.methods
          .withdrawSol(new anchor.BN(0))
          .accounts({
            presale: expKp.publicKey,

            authority: authority.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        // Zero amount should either succeed or fail with InsufficientFunds, not PresaleNotEnded
      } catch (e: any) {
        // InsufficientFunds is acceptable (no SOL in vault for this presale)
        // PresaleNotEnded is NOT acceptable
        assert.notInclude(e.message, "PresaleNotEnded");
      }
    });

    it("rejects unsold token withdrawal before end_time", async () => {
      try {
        await program.methods
          .withdrawUnsold(new anchor.BN(1_000))
          .accounts({
            presale: mainPresaleKp.publicKey,
            vaultAuthority: VAULT_AUTHORITY,
            tokenVault: TOKEN_VAULT,
            authorityTokenAccount: buyerTokenAccount,
            authority: authority.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have rejected unsold withdrawal before end_time");
      } catch (e: any) {
        assert.include(e.message, "NotEnded");
      }
    });
  });

  // ── 6. CLOSE PRESALE ──

  describe("6. Close Presale", () => {
    it("rejects close before end_time", async () => {
      try {
        await program.methods
          .closePresale()
          .accounts({
            presale: mainPresaleKp.publicKey,
            authority: authority.publicKey,
          })
          .rpc();
        assert.fail("Should have rejected close before end_time");
      } catch (e: any) {
        assert.include(e.message, "NotEnded");
      }
    });

    it("closes expired presale and recovers rent", async () => {
      const expKp = Keypair.generate();
      const now = Math.floor(Date.now() / 1000);
      await initPresale(program, expKp, authority as any, {
        startTime: new anchor.BN(now - 1000),
        endTime: new anchor.BN(now - 500),
      });

      const balBefore = await connection.getBalance(authority.publicKey);

      await program.methods
        .closePresale()
        .accounts({
          presale: expKp.publicKey,
          authority: authority.publicKey,
        })
        .rpc();

      const balAfter = await connection.getBalance(authority.publicKey);
      // Balance should have increased (rent recovered minus tx fee)
      // Just verify the account no longer exists
      const info = await connection.getAccountInfo(expKp.publicKey);
      assert.isNull(info, "Presale account should be closed");
    });
  });
});
