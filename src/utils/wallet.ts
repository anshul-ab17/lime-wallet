import { mnemonicToSeed } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Wallet, HDNodeWallet, JsonRpcProvider, parseEther } from "ethers";
import nacl from "tweetnacl";

// Supported networks
export interface NetworkConfig {
  id: string;
  name: string;
  chain: "solana" | "ethereum";
  rpcUrl: string;
  explorerUrl: string;
  currencySymbol: string;
  isTestnet: boolean;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  "solana-devnet": {
    id: "solana-devnet",
    name: "Solana Devnet",
    chain: "solana",
    rpcUrl: "https://api.devnet.solana.com",
    explorerUrl: "https://explorer.solana.com/tx/{{tx}}?cluster=devnet",
    currencySymbol: "SOL",
    isTestnet: true
  },
  "solana-mainnet": {
    id: "solana-mainnet",
    name: "Solana Mainnet",
    chain: "solana",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    explorerUrl: "https://explorer.solana.com/tx/{{tx}}",
    currencySymbol: "SOL",
    isTestnet: false
  },
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    name: "Ethereum Sepolia",
    chain: "ethereum",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io/tx/{{tx}}",
    currencySymbol: "ETH",
    isTestnet: true
  },
  "ethereum-mainnet": {
    id: "ethereum-mainnet",
    name: "Ethereum Mainnet",
    chain: "ethereum",
    rpcUrl: "https://cloudflare-eth.com",
    explorerUrl: "https://etherscan.io/tx/{{tx}}",
    currencySymbol: "ETH",
    isTestnet: false
  }
};

export interface WalletAccount {
  index: number;
  name: string;
  solanaAddress: string;
  solanaPrivateKey: string; // Hex representation
  ethereumAddress: string;
  ethereumPrivateKey: string; // Hex representation
}

// Generate accounts from mnemonic
export async function deriveAccounts(mnemonic: string, count: number, customNames?: Record<number, string>): Promise<WalletAccount[]> {
  const seed = await mnemonicToSeed(mnemonic);
  const accounts: WalletAccount[] = [];

  for (let i = 0; i < count; i++) {
    // 1. Solana Derivation
    const solPath = `m/44'/501'/${i}'/0'`;
    const solDerived = derivePath(solPath, seed.toString("hex"));
    const solSecret = nacl.sign.keyPair.fromSeed(solDerived.key).secretKey;
    const solKeypair = Keypair.fromSecretKey(solSecret);
    const solanaAddress = solKeypair.publicKey.toBase58();
    const solanaPrivateKey = Buffer.from(solSecret).toString("hex");

    // 2. Ethereum Derivation
    const ethPath = `m/44'/60'/${i}'/0'`;
    const hdNode = HDNodeWallet.fromSeed(seed);
    const ethChild = hdNode.derivePath(ethPath);
    const ethereumAddress = ethChild.address;
    const ethereumPrivateKey = ethChild.privateKey;

    const accountName = customNames && customNames[i] ? customNames[i] : `Account ${i + 1}`;

    accounts.push({
      index: i,
      name: accountName,
      solanaAddress,
      solanaPrivateKey,
      ethereumAddress,
      ethereumPrivateKey
    });
  }

  return accounts;
}

// Fetch balances
export async function fetchSolanaBalance(address: string, networkId: string): Promise<number> {
  try {
    const network = NETWORKS[networkId] || NETWORKS["solana-devnet"];
    const connection = new Connection(network.rpcUrl, "confirmed");
    const pubKey = new PublicKey(address);
    const balance = await connection.getBalance(pubKey);
    return balance / 1e9; // lamports to SOL
  } catch (error) {
    console.error("Error fetching Solana balance:", error);
    return 0;
  }
}

export async function fetchEthereumBalance(address: string, networkId: string): Promise<number> {
  try {
    const network = NETWORKS[networkId] || NETWORKS["ethereum-sepolia"];
    const provider = new JsonRpcProvider(network.rpcUrl);
    const balance = await provider.getBalance(address);
    return parseFloat(ethersFormatEther(balance));
  } catch (error) {
    console.error("Error fetching Ethereum balance:", error);
    return 0;
  }
}

// Simple ethers formatEther helper to avoid loading whole ethers library in some scopes if not needed
function ethersFormatEther(wei: bigint): string {
  const s = wei.toString();
  if (s === "0") return "0";
  
  const pad = s.padStart(19, '0');
  const intPart = pad.slice(0, -18);
  let fracPart = pad.slice(-18);
  
  // trim trailing zeros
  fracPart = fracPart.replace(/0+$/, '');
  if (fracPart.length === 0) return intPart;
  return `${intPart}.${fracPart}`;
}

// Request Devnet SOL
export async function requestSolanaAirdrop(address: string, networkId: string): Promise<string> {
  const network = NETWORKS[networkId];
  if (!network || network.id !== "solana-devnet") {
    throw new Error("Airdrop only available on Solana Devnet");
  }
  const connection = new Connection(network.rpcUrl, "confirmed");
  const pubKey = new PublicKey(address);
  const signature = await connection.requestAirdrop(pubKey, 2 * 1e9); // 2 SOL
  
  // Wait for confirmation
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: signature
  });
  
  return signature;
}

// Send Solana transaction
export async function sendSolanaTransaction(
  fromPrivateKeyHex: string,
  toAddress: string,
  amountSol: number,
  networkId: string
): Promise<string> {
  const network = NETWORKS[networkId];
  const connection = new Connection(network.rpcUrl, "confirmed");
  
  const fromSecret = Uint8Array.from(Buffer.from(fromPrivateKeyHex, "hex"));
  const fromKeypair = Keypair.fromSecretKey(fromSecret);
  const toPublicKey = new PublicKey(toAddress);
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports: Math.round(amountSol * 1e9)
    })
  );
  
  const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
  return signature;
}

// Send Ethereum transaction
export async function sendEthereumTransaction(
  privateKey: string,
  toAddress: string,
  amountEth: number,
  networkId: string
): Promise<string> {
  const network = NETWORKS[networkId];
  const provider = new JsonRpcProvider(network.rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  
  const txResponse = await wallet.sendTransaction({
    to: toAddress,
    value: parseEther(amountEth.toString())
  });
  
  // Wait for 1 confirmation
  const receipt = await txResponse.wait(1);
  if (!receipt) throw new Error("Transaction receipt is empty");
  return receipt.hash;
}

// Fetch real crypto prices from live market APIs (CryptoCompare, Binance, CoinGecko)
export async function fetchJupiterPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = {
    SOL: 0,
    ETH: 0,
    BTC: 0,
    JUP: 0,
    USDC: 1.00,
    LINK: 0
  };

  // Provider 1: CryptoCompare Multi-Price API (No key required, instant JSON)
  try {
    const res = await fetch("https://min-api.cryptocompare.com/data/pricemulti?fsyms=SOL,ETH,BTC,JUP,USDC,LINK&tsyms=USD");
    const json = await res.json();
    if (json) {
      if (json.SOL?.USD) prices.SOL = json.SOL.USD;
      if (json.ETH?.USD) prices.ETH = json.ETH.USD;
      if (json.BTC?.USD) prices.BTC = json.BTC.USD;
      if (json.JUP?.USD) prices.JUP = json.JUP.USD;
      if (json.USDC?.USD) prices.USDC = json.USDC.USD;
      if (json.LINK?.USD) prices.LINK = json.LINK.USD;
    }
  } catch (err) {
    console.warn("CryptoCompare price fetch error:", err);
  }

  // Provider 2: Binance Ticker API (Fallback for missing prices)
  if (!prices.SOL || !prices.ETH || !prices.BTC) {
    try {
      const res = await fetch("https://api.binance.com/api/v3/ticker/price");
      const list = await res.json();
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item.symbol === "SOLUSDT" && !prices.SOL) prices.SOL = parseFloat(item.price);
          if (item.symbol === "ETHUSDT" && !prices.ETH) prices.ETH = parseFloat(item.price);
          if (item.symbol === "BTCUSDT" && !prices.BTC) prices.BTC = parseFloat(item.price);
          if (item.symbol === "JUPUSDT" && !prices.JUP) prices.JUP = parseFloat(item.price);
          if (item.symbol === "LINKUSDT" && !prices.LINK) prices.LINK = parseFloat(item.price);
        }
      }
    } catch (err) {
      console.warn("Binance price fetch error:", err);
    }
  }

  // Provider 3: CoinGecko Simple Price API (Fallback)
  if (!prices.SOL || !prices.ETH) {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum,bitcoin,jupiter-exchange-solana,chainlink&vs_currencies=usd");
      const json = await res.json();
      if (json) {
        if (json.solana?.usd && !prices.SOL) prices.SOL = json.solana.usd;
        if (json.ethereum?.usd && !prices.ETH) prices.ETH = json.ethereum.usd;
        if (json.bitcoin?.usd && !prices.BTC) prices.BTC = json.bitcoin.usd;
        if (json["jupiter-exchange-solana"]?.usd && !prices.JUP) prices.JUP = json["jupiter-exchange-solana"].usd;
        if (json.chainlink?.usd && !prices.LINK) prices.LINK = json.chainlink.usd;
      }
    } catch (err) {
      console.warn("CoinGecko price fetch error:", err);
    }
  }

  return prices;
}
