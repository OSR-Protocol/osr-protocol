# MAINNET DEPLOYMENT — Flight Checklist

**Authority:** Ashim (Founder) + Shannon (Co-Founder)
**Purpose:** Step-by-step mainnet deployment sequence. Every transaction. Every verification. Every confirmation gate. Follow exactly.

---

## PRE-FLIGHT CHECKS

### 1. Legal Readiness

- [ ] Intercompany IP licensing agreement signed (BVI ↔ Florida)
- [ ] Terms of participation page live on osrprotocol.com
- [ ] Privacy policy page live on osrprotocol.com
- [ ] BVI entity certificate of incorporation on file
- [ ] Registered agent confirmation current

### 2. Infrastructure Readiness

- [ ] Ledger hardware wallet configured with Solana app
- [ ] Ledger connected and tested with `solana-keygen pubkey usb://ledger`
- [ ] Mainnet RPC endpoint configured (Helius paid tier or equivalent)
- [ ] Token metadata JSON hosted on Arweave (permanent URI confirmed)
- [ ] Token image hosted on Arweave (permanent URI confirmed, 512x512 minimum)
- [ ] All devnet tests passing (35/35)
- [ ] Presale contract audited by at least community review
- [ ] SECURITY.md current with all findings resolved

### 3. Financial Readiness

- [ ] Mainnet SOL funded in Ledger wallet (minimum 5 SOL for all transactions)
- [ ] Phantom/Backpack wallet configured for Ledger signing
- [ ] Rain wallet mainnet SOL available (5 SOL reserved from devnet setup)

---

## DEPLOYMENT SEQUENCE

### Step 1: Create Token Mint

**Transaction:** Create SPL token mint with Ledger as mint authority.

```bash
spl-token create-token \
  --decimals 9 \
  --url mainnet-beta \
  --fee-payer usb://ledger
```

**Expected output:** New token mint address.

**Verification:**
```bash
spl-token display <MINT_ADDRESS> --url mainnet-beta
```
Confirm: decimals = 9, supply = 0, mint authority = Ledger pubkey.

**Gate:** Record mint address. Proceed only after Solscan confirms the mint exists.

---

### Step 2: Set Token Metadata

**Transaction:** Attach Metaplex metadata to the token mint.

```bash
# Using Metaplex CLI or custom script
# Metadata JSON must be hosted on Arweave before this step
```

**Metadata fields:**
- Name: "Operating System R"
- Symbol: "OSR"
- URI: `https://arweave.net/<METADATA_TX_ID>`
- Image: `https://arweave.net/<IMAGE_TX_ID>`

**Verification:** Check Solscan token page shows name, symbol, and image.

**Gate:** Token displays correctly in Phantom wallet and on Solscan.

---

### Step 3: Mint Total Supply

**Transaction:** Mint 1,000,000,000 tokens (with 9 decimals) to the Ledger's token account.

```bash
# Create token account for the minter
spl-token create-account <MINT_ADDRESS> --url mainnet-beta --fee-payer usb://ledger

# Mint full supply
spl-token mint <MINT_ADDRESS> 1000000000 --url mainnet-beta --fee-payer usb://ledger
```

**Verification:**
```bash
spl-token supply <MINT_ADDRESS> --url mainnet-beta
# Expected: 1000000000
```

**Gate:** Supply = 1,000,000,000 exactly. No more, no less.

---

### Step 4: Distribute to Allocation Wallets

**Transaction:** Transfer tokens to each allocation wallet per ALLOCATION.md.

| Pool | Tokens | Wallet |
|------|--------|--------|
| BME Emission | 300,000,000 | Emission wallet |
| Ecosystem | 200,000,000 | Ecosystem wallet |
| Treasury | 120,000,000 | Treasury wallet |
| Presale | 100,000,000 | Presale vault (contract) |
| Ashim | 70,000,000 | Ashim vesting wallet |
| Shannon | 70,000,000 | Shannon org wallet |
| Jason | 50,000,000 | Jason vesting wallet |
| Lynn | 30,000,000 | Lynn vesting wallet |
| Liquidity | 50,000,000 | Liquidity wallet |
| Future Team | 10,000,000 | Future team wallet |

```bash
# For each allocation:
spl-token transfer <MINT_ADDRESS> <AMOUNT> <DESTINATION_WALLET> \
  --url mainnet-beta --fee-payer usb://ledger
```

**Verification:** After all transfers, check minter balance = 0.

```bash
spl-token accounts --url mainnet-beta --owner <LEDGER_PUBKEY>
```

**Gate:** Every allocation wallet has correct balance. Minter wallet has zero remaining. Total across all wallets = 1,000,000,000.

---

### Step 5: Revoke Mint Authority

**Transaction:** Permanently revoke mint authority. IRREVERSIBLE.

```bash
spl-token authorize <MINT_ADDRESS> mint --disable --url mainnet-beta --fee-payer usb://ledger
```

**Verification:**
```bash
spl-token display <MINT_ADDRESS> --url mainnet-beta
# Mint authority: (not set)
```

**Gate:** Mint authority shows "(not set)". No entity can ever create token 1,000,000,001.

---

### Step 6: Revoke Freeze Authority

**Transaction:** Permanently revoke freeze authority. IRREVERSIBLE.

```bash
spl-token authorize <MINT_ADDRESS> freeze --disable --url mainnet-beta --fee-payer usb://ledger
```

**Verification:**
```bash
spl-token display <MINT_ADDRESS> --url mainnet-beta
# Freeze authority: (not set)
```

**Gate:** Freeze authority shows "(not set)". No entity can ever freeze any holder's balance.

---

### Step 7: Deploy Presale Contract

**Transaction:** Deploy the presale program to mainnet.

```bash
cd contracts/presale
anchor build
anchor deploy --provider.cluster mainnet-beta
```

**Pre-deploy checklist:**
- [ ] Contract constants updated: MIN_PURCHASE_STABLECOIN = 549_000_000 ($549)
- [ ] Contract constants verified against D-005
- [ ] Anchor.toml cluster set to mainnet-beta
- [ ] Wallet path set to Ledger

**Verification:**
```bash
solana program show <PROGRAM_ID> --url mainnet-beta
```

**Gate:** Program deployed. Program ID recorded. Upgrade authority = Ledger pubkey.

---

### Step 8: Initialize Presale

**Transaction:** Call `initialize` with mainnet parameters.

**Parameters:**
- sol_price_lamports: calculated from current SOL/USD rate and $0.005/token
- min_purchase_lamports: calculated from current SOL/USD rate and $549 minimum
- max_per_wallet: $25,000 equivalent in tokens
- max_raise_lamports: $500,000 equivalent in SOL at current rate
- max_raise_stablecoin: 500,000,000,000 (6 decimals)
- start_time: presale start Unix timestamp
- end_time: presale end Unix timestamp (4 weeks after start)

**Gate:** Presale state readable on-chain. All parameters match D-005.

---

### Step 9: Fund Presale Token Vault

**Transaction:** Transfer 100,000,000 $OSR from presale allocation wallet to the presale contract's token vault.

**Gate:** Token vault balance = 100,000,000 $OSR.

---

### Step 10: Activate Presale

**Transaction:** Call `activate` on the presale contract.

**Gate:** Presale state shows `is_active = true`. The presale is live.

---

### Step 11: Create DEX Liquidity (Post-Presale)

After presale concludes:

1. Create Raydium CLMM pool ($OSR/USDC)
2. Deposit liquidity pool tokens (50,000,000 $OSR from Liquidity allocation)
3. Set initial price based on presale clearing price

**Gate:** Pool live on Jupiter aggregator. $OSR tradeable.

---

## POST-DEPLOYMENT VERIFICATION

- [ ] Token visible on Solscan with correct metadata and image
- [ ] Token visible in Phantom/Backpack wallets
- [ ] Presale contract accepting purchases
- [ ] All allocation wallets have correct balances
- [ ] Mint authority = not set (irrevocable)
- [ ] Freeze authority = not set (irrevocable)
- [ ] osrprotocol.com updated with mainnet addresses
- [ ] README.md updated with mainnet addresses
- [ ] ALLOCATION.md updated with mainnet proof

---

## EMERGENCY PROCEDURES

**If presale contract has a critical bug after activation:**
1. Call `pause` immediately
2. Assess the issue
3. If funds at risk, call `withdraw_sol` and `withdraw_stablecoin` (paused state allows)
4. Deploy patched contract to new program ID
5. Migrate presale state

**If token metadata is wrong:**
1. Metadata can be updated if update authority is retained
2. Update metadata via Metaplex CLI
3. Verify on Solscan

**If allocation amounts are wrong:**
1. Mint authority is revoked — cannot mint more
2. Reallocate from the pool that received excess
3. Document the correction in ALLOCATION.md
