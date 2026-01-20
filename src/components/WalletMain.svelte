<script lang="ts">
  import { onMount } from "svelte";
  import { 
    NETWORKS, 
    deriveAccounts, 
    fetchSolanaBalance, 
    fetchEthereumBalance, 
    requestSolanaAirdrop, 
    sendSolanaTransaction, 
    sendEthereumTransaction, 
    fetchJupiterPrices,
    type WalletAccount 
  } from "../utils/wallet";
  import { 
    getAccountsCount, 
    setAccountsCount, 
    getStoredNetwork, 
    setStoredNetwork,
    getStoredUsername,
    setStoredUsername,
    getStoredAccountNames,
    setStoredAccountNames
  } from "../utils/crypto";
  
  import xNFTCoralSwap from "./xNFTCoralSwap.svelte";
  import xNFTStaking from "./xNFTStaking.svelte";
  import SettingsScreen from "./SettingsScreen.svelte";

  // Svelte 5 props
  let { mnemonic, password, onLock, logAction, theme = "dark" } = $props<{
    mnemonic: string;
    password: string;
    onLock: () => void;
    logAction: (msg: string) => void;
    theme?: "light" | "dark";
  }>();

  // API Config
  const LOGODEV_TOKEN = import.meta.env.VITE_LOGODEV_TOKEN || "live_6a1a28fd-6420-4492-aeb0-b297461d9de2";

  // Runes (State)
  let accounts = $state<WalletAccount[]>([]);
  let activeAccountIndex = $state(0);
  let activeNetworkId = $state("solana-devnet");
  let balance = $state(0);
  
  // Custom token balances (swappable / mock)
  let usdcBalance = $state(0.00);
  let jupBalance = $state(0.00);
  let linkBalance = $state(0.00);
  let hypeBalance = $state(0.00);

  // Live prices from CryptoCompare / Binance / CoinGecko APIs
  let livePrices = $state<Record<string, number>>({
    SOL: 0,
    ETH: 0,
    BTC: 0,
    JUP: 0,
    USDC: 1.00,
    LINK: 0
  });

  // Bottom Navigation state: "home" | "swap" | "activity" | "explore"
  let currentNavTab = $state("home");
  
  // Sub-tabs on Home screen: "tokens" | "perps" | "collectibles"
  let homeSubTab = $state("tokens");

  // Sub-tabs on Swap screen: "tokens" | "perps"
  let swapSubTab = $state("tokens");

  // Modals & Menu status
  let username = $state(getStoredUsername() || "");
  let showSettings = $state(false);
  let isRefreshing = $state(false);
  let showAccountMenu = $state(false);
  let showReceiveModal = $state(false);
  let showSendModal = $state(false);
  let showAddAccountModal = $state(false);
  let newAccountNameInput = $state("");
  let addAccountError = $state("");

  // Send transaction form fields
  let sendAddress = $state("");
  let sendAmount = $state("");
  let isSendingTx = $state(false);
  let sendError = $state("");
  let sendSuccessHash = $state("");

  // Swap Widget Form State
  let swapPayAmount = $state("");
  let swapReceiveAmount = $derived.by(() => {
    const payAmt = parseFloat(swapPayAmount) || 0;
    if (payAmt <= 0) return "0";
    return (payAmt * 52.8).toFixed(2); // Mock SOL -> HYPE rate (1 SOL = 52.8 HYPE)
  });

  // Activity logs ledger
  interface TxRecord {
    id: string;
    type: "Receive" | "Send" | "Swap" | "Airdrop" | "Stake";
    desc: string;
    amount: string;
    timestamp: string;
    txHash: string;
    status: "success" | "pending" | "failed";
  }
  let activities = $state<TxRecord[]>([]);

  // Derived state
  let currentAccount = $derived(accounts[activeAccountIndex]);
  let currentNetwork = $derived(NETWORKS[activeNetworkId]);
  
  let tokenPrice = $derived.by(() => {
    if (activeNetworkId.startsWith("solana")) return livePrices.SOL; 
    return livePrices.ETH; 
  });
  
  let totalBalanceUsd = $derived(
    balance * tokenPrice + 
    usdcBalance * livePrices.USDC + 
    (activeNetworkId.startsWith("solana") ? jupBalance * livePrices.JUP : linkBalance * 15.2) +
    hypeBalance * 0.15
  );

  // Dynamic token list cards based on current network chain
  let tokenCards = $derived.by(() => {
    const list = [];
    if (currentNetwork.chain === "solana") {
      list.push({
        symbol: "SOL",
        name: "Solana",
        balance: balance,
        price: livePrices.SOL,
        value: balance * livePrices.SOL,
        verified: true,
        logo: `https://img.logo.dev/crypto/sol?token=${LOGODEV_TOKEN}`
      });
      list.push({
        symbol: "USDC",
        name: "USD Coin",
        balance: usdcBalance,
        price: livePrices.USDC,
        value: usdcBalance * livePrices.USDC,
        verified: true,
        logo: `https://img.logo.dev/crypto/usdc?token=${LOGODEV_TOKEN}`
      });
      list.push({
        symbol: "JUP",
        name: "Jupiter",
        balance: jupBalance,
        price: livePrices.JUP,
        value: jupBalance * livePrices.JUP,
        verified: true,
        logo: `https://img.logo.dev/crypto/jup?token=${LOGODEV_TOKEN}`
      });
      list.push({
        symbol: "BTC",
        name: "Bitcoin",
        balance: 0,
        price: livePrices.BTC || 0,
        value: 0,
        verified: true,
        logo: `https://img.logo.dev/crypto/btc?token=${LOGODEV_TOKEN}`
      });
      list.push({
        symbol: "MON",
        name: "Monad",
        balance: 0,
        price: 0,
        value: 0,
        verified: true,
        logo: `https://img.logo.dev/crypto/mon?token=${LOGODEV_TOKEN}`
      });
    } else {
      list.push({
        symbol: "ETH",
        name: "Ethereum",
        balance: balance,
        price: livePrices.ETH,
        value: balance * livePrices.ETH,
        verified: true,
        logo: `https://img.logo.dev/crypto/eth?token=${LOGODEV_TOKEN}`
      });
      list.push({
        symbol: "USDC",
        name: "USD Coin",
        balance: usdcBalance,
        price: livePrices.USDC,
        value: usdcBalance * livePrices.USDC,
        verified: true,
        logo: `https://img.logo.dev/crypto/usdc?token=${LOGODEV_TOKEN}`
      });
      list.push({
        symbol: "LINK",
        name: "Chainlink",
        balance: linkBalance,
        price: livePrices.LINK || 0,
        value: linkBalance * (livePrices.LINK || 0),
        verified: true,
        logo: `https://img.logo.dev/crypto/link?token=${LOGODEV_TOKEN}`
      });
      list.push({
        symbol: "BTC",
        name: "Bitcoin",
        balance: 0,
        price: livePrices.BTC || 0,
        value: 0,
        verified: true,
        logo: `https://img.logo.dev/crypto/btc?token=${LOGODEV_TOKEN}`
      });
    }
    return list;
  });

  // Fetch prices from Jupiter & CoinGecko APIs
  async function updatePrices() {
    const prices = await fetchJupiterPrices();
    livePrices = prices;
    logAction(`Live prices: SOL = $${livePrices.SOL.toFixed(2)} | JUP = $${livePrices.JUP.toFixed(4)} | ETH = $${livePrices.ETH.toFixed(2)}`);
  }

  onMount(async () => {
    activeNetworkId = getStoredNetwork();
    await loadAccounts();
    await updatePrices();
    await refreshBalance();
    
    // Poll balance and prices every 15 seconds
    const interval = setInterval(async () => {
      await updatePrices();
      await refreshBalance();
    }, 15000);

    return () => clearInterval(interval);
  });

  async function loadAccounts() {
    logAction("Deriving wallet addresses from seed...");
    const count = getAccountsCount();
    const customNames = getStoredAccountNames();
    accounts = await deriveAccounts(mnemonic, count, customNames);
    
    if (!username && accounts[0]) {
      username = accounts[0].name.replace(/^@/, "");
      setStoredUsername(username);
    }
    logAction(`Derived ${count} account(s) successfully.`);
  }

  async function refreshBalance() {
    if (!currentAccount) return;
    isRefreshing = true;
    const addr = currentNetwork.chain === "solana" ? currentAccount.solanaAddress : currentAccount.ethereumAddress;
    
    logAction(`Fetching balance for ${currentAccount.name} on ${currentNetwork.name}...`);
    if (currentNetwork.chain === "solana") {
      balance = await fetchSolanaBalance(addr, activeNetworkId);
    } else {
      balance = await fetchEthereumBalance(addr, activeNetworkId);
    }
    
    logAction(`Balance updated: ${balance.toFixed(4)} ${currentNetwork.currencySymbol}`);
    isRefreshing = false;
  }

  async function handleNetworkChange(netId: string) {
    activeNetworkId = netId;
    setStoredNetwork(netId);
    logAction(`Switched active network to: ${NETWORKS[netId].name}`);
    await refreshBalance();
  }

  function openAddAccountModal() {
    newAccountNameInput = `Account ${accounts.length + 1}`;
    addAccountError = "";
    showAddAccountModal = true;
  }

  async function confirmAddAccount() {
    const cleanName = newAccountNameInput.trim();
    if (!cleanName) {
      addAccountError = "Account username/name cannot be empty.";
      return;
    }

    const isDuplicate = accounts.some(acc => acc.name.toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      addAccountError = `Username/Account name "${cleanName}" is already taken! Choose a unique name.`;
      return;
    }

    const nextIndex = accounts.length;
    const nextCount = nextIndex + 1;
    const customNames = getStoredAccountNames();
    customNames[nextIndex] = cleanName;
    setStoredAccountNames(customNames);
    setAccountsCount(nextCount);

    showAddAccountModal = false;
    logAction(`Added new account with unique username/name "${cleanName}".`);
    await loadAccounts();
    activeAccountIndex = nextIndex;
    await refreshBalance();
  }

  async function handleUpdateAccountName(accountIndex: number, newName: string) {
    const cleanName = newName.trim();
    if (!cleanName) throw new Error("Username/Name cannot be empty.");

    const isDuplicate = accounts.some((acc, idx) => idx !== accountIndex && acc.name.toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      throw new Error(`Username/Account name "${cleanName}" is already taken! Choose a unique name.`);
    }

    const customNames = getStoredAccountNames();
    customNames[accountIndex] = cleanName;
    setStoredAccountNames(customNames);

    if (accountIndex === 0) {
      username = cleanName.replace(/^@/, "");
      setStoredUsername(username);
    }

    await loadAccounts();
    logAction(`Updated account ${accountIndex + 1} name to "${cleanName}".`);
  }

  // Request Devnet SOL
  async function triggerAirdrop() {
    if (currentNetwork.id !== "solana-devnet") return;
    isRefreshing = true;
    logAction("Requesting 2 SOL Devnet airdrop...");
    try {
      const hash = await requestSolanaAirdrop(currentAccount.solanaAddress, activeNetworkId);
      logAction(`Airdrop successful. Tx Hash: ${hash}`);
      
      activities = [{
        id: `tx-${Date.now()}`,
        type: "Airdrop",
        desc: "Solana Devnet Airdrop",
        amount: "+2.0 SOL",
        timestamp: "Just now",
        txHash: hash,
        status: "success"
      }, ...activities];
      
      await refreshBalance();
    } catch (e: any) {
      logAction(`Airdrop request failed: ${e.message}`);
      alert("Airdrop rate limit hit. Please try again later.");
    } finally {
      isRefreshing = false;
    }
  }

  // Send transaction helper
  async function handleSendTransaction() {
    if (!sendAddress || !sendAmount || parseFloat(sendAmount) <= 0) {
      sendError = "Provide a valid address and positive amount.";
      return;
    }

    isSendingTx = true;
    sendError = "";
    sendSuccessHash = "";

    try {
      const amt = parseFloat(sendAmount);
      logAction(`Initiating transfer of ${amt} ${currentNetwork.currencySymbol} to ${sendAddress}`);
      let hash = "";

      if (currentNetwork.chain === "solana") {
        hash = await sendSolanaTransaction(
          currentAccount.solanaPrivateKey,
          sendAddress,
          amt,
          activeNetworkId
        );
      } else {
        hash = await sendEthereumTransaction(
          currentAccount.ethereumPrivateKey,
          sendAddress,
          amt,
          activeNetworkId
        );
      }

      logAction(`Transfer complete. Transaction Hash: ${hash}`);
      sendSuccessHash = hash;
      
      activities = [{
        id: `tx-${Date.now()}`,
        type: "Send",
        desc: `Sent to ${sendAddress.substring(0,6)}...${sendAddress.substring(sendAddress.length-4)}`,
        amount: `-${amt} ${currentNetwork.currencySymbol}`,
        timestamp: "Just now",
        txHash: hash,
        status: "success"
      }, ...activities];

      sendAmount = "";
      sendAddress = "";
      await refreshBalance();
      setTimeout(() => { showSendModal = false; sendSuccessHash = ""; }, 4000);
    } catch (e: any) {
      logAction(`Transfer failed: ${e.message}`);
      sendError = e.message || "Transaction failed.";
    } finally {
      isSendingTx = false;
    }
  }

  // Simulated Swap
  function triggerLocalSwap() {
    const payAmt = parseFloat(swapPayAmount) || 0;
    if (payAmt <= 0) {
      alert("Please specify a pay amount.");
      return;
    }
    if (balance < payAmt) {
      alert("Insufficient balance to swap.");
      return;
    }
    
    const recAmt = parseFloat(swapReceiveAmount);
    balance -= payAmt;
    hypeBalance += recAmt;
    swapPayAmount = "";

    logAction(`Swapped ${payAmt} SOL for ${recAmt} HYPE`);
    activities = [{
      id: `tx-${Date.now()}`,
      type: "Swap",
      desc: "Swapped SOL for HYPE",
      amount: `-${payAmt} SOL / +${recAmt} HYPE`,
      timestamp: "Just now",
      txHash: "Simulated-Swap-xNFT-Txn",
      status: "success"
    }, ...activities];

    refreshBalance();
    alert("Swap successful! HYPE balance updated.");
  }

  function selectTrendingSwap(symbol: string) {
    swapPayAmount = "1.00";
  }

  function setSwapPercentage(pct: number) {
    swapPayAmount = (balance * (pct / 100)).toFixed(4);
  }

  function copyAddressToClipboard() {
    const addr = currentNetwork.chain === "solana" ? currentAccount.solanaAddress : currentAccount.ethereumAddress;
    navigator.clipboard.writeText(addr);
    logAction(`Copied address to clipboard: ${addr}`);
    alert("Address copied to clipboard!");
  }
</script>

<div class="wallet-layout-shell">
  {#if showSettings}
    <SettingsScreen
      account={currentAccount}
      activeNetworkId={activeNetworkId}
      onClose={() => showSettings = false}
      onNetworkChange={handleNetworkChange}
      onAddAccount={openAddAccountModal}
      onUpdateAccountName={handleUpdateAccountName}
      onLock={onLock}
      {logAction}
    />
  {:else}
    <!-- Top Account Header -->
    <div class="wallet-header">
      <div class="header-left">
        <!-- Cartoon Illustration Avatar Headset Guy -->
        <button class="user-avatar-btn" onclick={() => showSettings = true} title="Settings">
          <svg viewBox="0 0 100 100" class="avatar-svg">
            <circle cx="50" cy="50" r="48" fill="#c7f284" opacity="0.15"/>
            <circle cx="50" cy="50" r="40" fill="var(--color-primary)"/>
            <path d="M 25,50 A 25,25 0 0,1 75,50" fill="none" stroke="#1e1b4b" stroke-width="8" stroke-linecap="round"/>
            <rect x="18" y="42" width="12" height="20" rx="6" fill="#1e1b4b"/>
            <rect x="70" y="42" width="12" height="20" rx="6" fill="#1e1b4b"/>
            <circle cx="42" cy="52" r="3" fill="#fff"/>
            <circle cx="58" cy="52" r="3" fill="#fff"/>
            <path d="M 46,62 Q 50,66 54,62" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </button>
        
        <div class="header-account-meta">
          <span class="user-handle" onclick={() => showSettings = true}>@{username || (currentAccount ? currentAccount.name : 'User')}</span>
          <button class="account-trigger" onclick={() => showAccountMenu = !showAccountMenu}>
            {currentAccount ? currentAccount.name : 'Account 1'} <span class="chevron">▼</span>
          </button>
          
          {#if showAccountMenu}
            <div class="account-menu-overlay" onclick={() => showAccountMenu = false}></div>
            <div class="account-menu-dropdown animate-fade-in">
              <div class="account-list">
                {#each accounts as acc, i}
                  <button class="account-item {i === activeAccountIndex ? 'active' : ''}" onclick={() => { activeAccountIndex = i; refreshBalance(); showAccountMenu = false; }}>
                    <div class="account-avatar">A{i+1}</div>
                    <div class="account-details">
                      <span class="account-name">{acc.name}</span>
                      <span class="account-addr">
                        {currentNetwork.chain === "solana" 
                          ? `${acc.solanaAddress.substring(0, 4)}...${acc.solanaAddress.slice(-4)}`
                          : `${acc.ethereumAddress.substring(0, 5)}...${acc.ethereumAddress.slice(-4)}`}
                      </span>
                    </div>
                    {#if i === activeAccountIndex}
                      <span class="account-active-check">✓</span>
                    {/if}
                  </button>
                {/each}
              </div>
              <button class="add-account-action-btn" onclick={() => { openAddAccountModal(); showAccountMenu = false; }}>
                <span class="plus-icon">+</span> Add Account
              </button>
            </div>
          {/if}
        </div>
      </div>
      
      <div class="header-right">
        <!-- Explorer Status / Monitor Icon -->
        <span class="explorer-status-icon" onclick={copyAddressToClipboard} title="Copy Address">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
            <path d="M12 17v4M8 21h8"></path>
          </svg>
        </span>
        <!-- Double lines adjust settings Icon -->
        <span class="adjustments-icon" onclick={() => showSettings = true} title="Preferences">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="2" y1="14" x2="6" y2="14"></line>
            <line x1="10" y1="8" x2="14" y2="8"></line>
            <line x1="18" y1="16" x2="22" y2="16"></line>
          </svg>
        </span>
      </div>
    </div>

    <!-- Scrollable Wallet Viewport Content -->
    <div class="wallet-viewport-content">
      
      <!-- VIEW: HOME (Tab assets) -->
      {#if currentNavTab === "home"}
        <div class="home-tab-view animate-fade-in">
          
          <!-- gm! Crescent Moon Welcome Onboarding Card -->
          <div class="welcome-gm-card">
            <div class="gm-illustration-wrapper">
              <svg viewBox="0 0 120 100" class="gm-svg">
                <path d="M 20,25 L 22,20 L 24,25 L 29,27 L 24,29 L 22,34 L 20,29 L 15,27 Z" fill="#c7f284"/>
                <path d="M 95,45 L 97,40 L 99,45 L 104,47 L 99,49 L 97,54 L 95,49 L 90,47 Z" fill="#c7f284"/>
                <path d="M 85,15 L 86.5,11 L 88,15 L 92,16.5 L 88,18 L 86.5,22 L 85,18 L 81,16.5 Z" fill="#c7f284"/>
                
                <ellipse cx="65" cy="40" rx="35" ry="12" fill="#121418" stroke="#222" stroke-width="2"/>
                <path d="M 50,45 C 50,25 70,12 85,22 C 73,20 60,32 63,47 C 64,52 68,54 68,54 C 68,54 50,55 50,45 Z" fill="#fff"/>
                <path d="M 68,28 Q 72,32 76,28" fill="none" stroke="#121418" stroke-width="2" stroke-linecap="round"/>
                <path d="M 78,34 Q 82,38 86,34" fill="none" stroke="#121418" stroke-width="2" stroke-linecap="round"/>
                <circle cx="72" cy="35" r="2.5" fill="#f472b6" opacity="0.6"/>
                
                <path d="M 28,45 C 28,38 48,38 48,45 C 48,52 38,52 34,56 L 33,52 C 28,52 28,48 28,45 Z" fill="var(--color-primary)"/>
                <text x="38" y="49" font-size="8" font-family="sans-serif" font-weight="900" fill="#121418" text-anchor="middle">gm!</text>
              </svg>
            </div>
            
            <div class="gm-welcome-meta">
              <h2 class="gm-welcome-title">Welcome,<br/>@{username || (currentAccount ? currentAccount.name : 'User')}</h2>
              <p class="gm-welcome-subtitle">Add Solana (SOL) to your wallet to get started</p>
            </div>
            
            <div class="gm-welcome-actions">
              <button class="welcome-btn-primary" onclick={() => showReceiveModal = true}>Buy SOL with cash</button>
              <button class="welcome-btn-secondary" onclick={() => showReceiveModal = true}>Transfer crypto</button>
            </div>
          </div>

          <!-- Total Portfolio Summary Balance -->
          <div class="portfolio-balance-block">
            <span class="portfolio-usd-title">${totalBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span class="portfolio-network-lbl">
              {balance.toFixed(4)} {currentNetwork.currencySymbol}
              {#if currentNetwork.id === "solana-devnet"}
                <span class="devnet-pill" onclick={triggerAirdrop}>Airdrop Faucet 💧</span>
              {/if}
            </span>
          </div>

          <!-- Operations Action Grid (Send, Swap, Receive, Buy) -->
          <div class="operations-grid-row">
            <button class="action-grid-card" onclick={() => showSendModal = true}>
              <div class="action-circle-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </div>
              <span class="action-grid-lbl">Send</span>
            </button>

            <button class="action-grid-card" onclick={() => currentNavTab = "swap"}>
              <div class="action-circle-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="16 3 21 8 16 13"></polyline>
                  <line x1="21" y1="8" x2="9" y2="8"></line>
                  <polyline points="8 21 3 16 8 11"></polyline>
                  <line x1="3" y1="16" x2="15" y2="16"></line>
                </svg>
              </div>
              <span class="action-grid-lbl">Swap</span>
            </button>

            <button class="action-grid-card" onclick={() => showReceiveModal = true}>
              <div class="action-circle-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <span class="action-grid-lbl">Receive</span>
            </button>

            <button class="action-grid-card" onclick={() => showReceiveModal = true}>
              <div class="action-circle-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="12" y2="12"></line>
                </svg>
              </div>
              <span class="action-grid-lbl">Buy</span>
            </button>
          </div>

          <!-- Tokens, Perps, Collectibles Sub-tabs -->
          <div class="subtabs-bar">
            <button class="subtab-item {homeSubTab === 'tokens' ? 'active' : ''}" onclick={() => homeSubTab = 'tokens'}>
              Tokens
            </button>
            <button class="subtab-item {homeSubTab === 'perps' ? 'active' : ''}" onclick={() => homeSubTab = 'perps'}>
              Perps
            </button>
            <button class="subtab-item {homeSubTab === 'collectibles' ? 'active' : ''}" onclick={() => homeSubTab = 'collectibles'}>
              Collectibles
            </button>
            <span class="subtab-dots">•••</span>
          </div>

          <!-- Tokens List -->
          {#if homeSubTab === "tokens"}
            <div class="token-list-cards">
              {#each tokenCards as token}
                <div class="token-card-row">
                  <div class="token-card-left">
                    <div class="token-logo-circle">
                      <img 
                        src={token.logo} 
                        alt={token.symbol} 
                        class="token-card-img"
                        onerror={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div class="token-card-meta">
                      <span class="token-card-name">{token.name} <span class="verified-badge">✓</span></span>
                      <span class="token-card-qty">{token.balance} {token.symbol}</span>
                    </div>
                  </div>
                  <div class="token-card-right">
                    <span class="token-card-usd">${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span class="token-card-price">${token.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              {/each}
            </div>
          {:else if homeSubTab === "collectibles"}
            <!-- NFTs List -->
            <div class="collectibles-list-panel">
              <div class="nft-square-row">
                <div class="nft-square-card">
                  <div class="nft-square-media bg-madlads">
                    <svg viewBox="0 0 100 100" class="nft-vector">
                      <rect width="100" height="100" fill="#ff4f38" opacity="0.1"/>
                      <circle cx="50" cy="45" r="22" fill="#ff4f38" opacity="0.8"/>
                      <circle cx="43" cy="40" r="4" fill="#000"/>
                      <circle cx="57" cy="40" r="4" fill="#000"/>
                      <path d="M 38 60 Q 50 72 62 60" fill="none" stroke="#000" stroke-width="4"/>
                      <rect x="25" y="18" width="50" height="8" rx="4" fill="#18181c"/>
                    </svg>
                  </div>
                  <div class="nft-square-meta">
                    <span class="nft-square-coll">Mad Lads</span>
                    <span class="nft-square-id">#1337</span>
                  </div>
                </div>

                <div class="nft-square-card">
                  <div class="nft-square-media bg-claynosaurs">
                    <svg viewBox="0 0 100 100" class="nft-vector">
                      <rect width="100" height="100" fill="#14f195" opacity="0.1"/>
                      <path d="M 25 75 Q 35 45 60 45 Q 80 45 85 60 L 90 75 Z" fill="#14f195"/>
                      <circle cx="68" cy="52" r="2.5" fill="#000"/>
                      <rect x="28" y="70" width="10" height="12" fill="#0c8754"/>
                      <rect x="42" y="70" width="10" height="12" fill="#0c8754"/>
                    </svg>
                  </div>
                  <div class="nft-square-meta">
                    <span class="nft-square-coll">Claynosaurz</span>
                    <span class="nft-square-id">#8092</span>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <div class="empty-list-panel text-center">
              <span class="empty-icon">📈</span>
              <p class="empty-text">No active positions</p>
            </div>
          {/if}

        </div>

      <!-- VIEW: SWAP (Tab swap) -->
      {:else if currentNavTab === "swap"}
        <div class="swap-tab-view animate-fade-in">
          
          <!-- Swap Widget -->
          <div class="swap-widget-card">
            <!-- Pay Pane -->
            <div class="swap-pane">
              <span class="pane-title">You Pay</span>
              <div class="pane-input-row">
                <input 
                  type="number" 
                  class="swap-amount-input" 
                  placeholder="0"
                  bind:value={swapPayAmount}
                />
                <button class="token-selector-pill">
                  <div class="pill-logo solana">S</div>
                  <span class="pill-ticker">SOL</span>
                  <span class="verified-badge">✓</span>
                  <span class="chevron">▼</span>
                </button>
              </div>
              <div class="pane-balance-row">
                <span class="pane-bal-val">Balance: {balance.toFixed(4)}</span>
                <div class="percent-pills">
                  <button class="pct-pill" onclick={() => setSwapPercentage(50)}>50%</button>
                  <button class="pct-pill" onclick={() => setSwapPercentage(100)}>Max</button>
                </div>
              </div>
            </div>

            <!-- Swapping Double Arrow Toggle circular button in middle overlay -->
            <div class="swap-toggle-overlay">
              <button class="swap-toggle-btn">⇅</button>
            </div>

            <!-- Receive Pane -->
            <div class="swap-pane">
              <span class="pane-title">You Receive</span>
              <div class="pane-input-row">
                <span class="swap-amount-value">{swapReceiveAmount}</span>
                <button class="token-selector-pill">
                  <div class="pill-logo hype">H</div>
                  <span class="pill-ticker">HYPE</span>
                  <span class="verified-badge">✓</span>
                  <span class="chevron">▼</span>
                </button>
              </div>
              <div class="pane-balance-row">
                <span class="pane-bal-val">Balance: {hypeBalance.toFixed(2)}</span>
              </div>
            </div>

            <!-- Submit Swap -->
            <button class="execute-swap-btn" onclick={triggerLocalSwap}>
              Review Swap
            </button>
          </div>

          <!-- Swap Subtabs (Tokens, Perps) -->
          <div class="swap-subtabs-row">
            <div class="swap-subtabs-left">
              <button class="swap-subtab {swapSubTab === 'tokens' ? 'active' : ''}" onclick={() => swapSubTab = 'tokens'}>Tokens</button>
              <button class="swap-subtab {swapSubTab === 'perps' ? 'active' : ''}" onclick={() => swapSubTab = 'perps'}>Perps</button>
            </div>
            <span class="see-more-link">See More</span>
          </div>

          <!-- Filters Dropdowns badges -->
          <div class="filter-badges-row">
            <button class="filter-badge">Rank <span class="chevron">▼</span></button>
            <button class="filter-badge">Solana <span class="chevron">▼</span></button>
            <button class="filter-badge">24h <span class="chevron">▼</span></button>
          </div>

          <!-- Trending List -->
          <div class="trending-tokens-list">
            <div class="trending-row" onclick={() => selectTrendingSwap("Jimothy")}>
              <div class="trend-left">
                <div class="trend-avatar-circle jim">J</div>
                <div class="trend-meta">
                  <span class="trend-name">Jimothy <span class="verified-badge">✓</span></span>
                  <span class="trend-cap">$8.6M MC</span>
                </div>
              </div>
              <div class="trend-right">
                <span class="trend-val">$0.00869223</span>
                <span class="trend-change negative">-41.01%</span>
              </div>
            </div>

            <div class="trending-row" onclick={() => selectTrendingSwap("Mouse")}>
              <div class="trend-left">
                <div class="trend-avatar-circle mouse">M</div>
                <div class="trend-meta">
                  <span class="trend-name">Mouse <span class="verified-badge">✓</span></span>
                  <span class="trend-cap">$1.2M MC</span>
                </div>
              </div>
              <div class="trend-right">
                <span class="trend-val">$0.00030529</span>
                <span class="trend-change positive">+12.4%</span>
              </div>
            </div>
          </div>

        </div>

      <!-- VIEW: ACTIVITY (Tab activity) -->
      {:else if currentNavTab === "activity"}
        <div class="activity-tab-view animate-fade-in">
          {#if activities.length === 0}
            <div class="empty-activity-view">
              <span class="empty-icon">🕒</span>
              <p class="empty-text">No activity</p>
            </div>
          {:else}
            <div class="activities-ledger">
              {#each activities as act}
                <div class="activity-card-row">
                  <div class="act-card-left">
                    <span class="act-card-badge {act.type.toLowerCase()}">
                      {act.type === "Receive" ? "↓" : act.type === "Send" ? "↑" : act.type === "Swap" ? "⇄" : "⚡"}
                    </span>
                    <div class="act-card-text">
                      <span class="act-card-title">{act.type} - {act.desc}</span>
                      <span class="act-card-time">{act.timestamp}</span>
                    </div>
                  </div>
                  <div class="act-card-right">
                    <span class="act-card-amount {act.amount.startsWith('+') ? 'income' : 'outcome'}">
                      {act.amount}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

      <!-- VIEW: EXPLORE (Tab explore) -->
      {:else if currentNavTab === "explore"}
        <div class="explore-tab-view animate-fade-in">
          <!-- Search Bar -->
          <div class="explore-search-container">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="search-input-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="explore-search-input" placeholder="Search for sites, tokens" />
          </div>

          <!-- Color category badges -->
          <div class="category-scroll-row">
            <span class="category-pill tokens">Tokens</span>
            <span class="category-pill perps">Perps</span>
            <span class="category-pill lists">Lists</span>
          </div>

          <!-- Featured Card: Phantom Terminal -->
          <div class="explore-featured-card">
            <div class="featured-header">
              <div class="featured-icon">🌐</div>
              <div class="featured-meta">
                <span class="featured-title">Phantom Terminal</span>
                <span class="featured-subtitle">Execute instant swappings securely</span>
              </div>
            </div>
            <button class="featured-action-btn">Visit Site</button>
          </div>

          <!-- Trending list inside explore -->
          <h3 class="explore-section-title">Trending</h3>
          <div class="trending-tokens-list">
            <div class="trending-row">
              <div class="trend-left">
                <div class="trend-avatar-circle jim">J</div>
                <div class="trend-meta">
                  <span class="trend-name">Jimothy</span>
                  <span class="trend-cap">$8.6M MC</span>
                </div>
              </div>
              <div class="trend-right">
                <span class="trend-val">$0.00869223</span>
                <span class="trend-change negative">-41.01%</span>
              </div>
            </div>

            <div class="trending-row">
              <div class="trend-left">
                <div class="trend-avatar-circle mouse">M</div>
                <div class="trend-meta">
                  <span class="trend-name">Mouse</span>
                  <span class="trend-cap">$1.2M MC</span>
                </div>
              </div>
              <div class="trend-right">
                <span class="trend-val">$0.00030529</span>
                <span class="trend-change positive">+12.4%</span>
              </div>
            </div>
          </div>

        </div>
      {/if}

    </div>

    <!-- Bottom Lavender Navigation Bar -->
    <div class="wallet-bottom-nav">
      <button class="nav-icon-btn {currentNavTab === 'home' ? 'active' : ''}" onclick={() => currentNavTab = 'home'} title="Home">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </button>

      <button class="nav-icon-btn {currentNavTab === 'swap' ? 'active' : ''}" onclick={() => currentNavTab = 'swap'} title="Swap">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 3 21 8 16 13"></polyline>
          <line x1="21" y1="8" x2="9" y2="8"></line>
          <polyline points="8 21 3 16 8 11"></polyline>
          <line x1="3" y1="16" x2="15" y2="16"></line>
        </svg>
      </button>

      <button class="nav-icon-btn {currentNavTab === 'activity' ? 'active' : ''}" onclick={() => currentNavTab = 'activity'} title="Activity">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </button>

      <button class="nav-icon-btn {currentNavTab === 'explore' ? 'active' : ''}" onclick={() => currentNavTab = 'explore'} title="Explore">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    </div>
  {/if}

  <!-- Modals Overlay -->
  {#if showReceiveModal}
    <div class="modal-overlay" onclick={() => showReceiveModal = false}>
      <div class="modal-card animate-fade-in" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3>Receive Assets</h3>
          <button class="close-icon-btn" onclick={() => showReceiveModal = false}>✕</button>
        </div>
        
        <div class="modal-body text-center">
          <div class="qr-code-placeholder">
            <svg viewBox="0 0 100 100" class="qr-svg">
              <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" stroke-width="4"/>
              <rect x="20" y="20" width="20" height="20" fill="currentColor"/>
              <rect x="25" y="25" width="10" height="10" fill="#121418"/>
              <rect x="60" y="20" width="20" height="20" fill="currentColor"/>
              <rect x="65" y="25" width="10" height="10" fill="#121418"/>
              <rect x="20" y="60" width="20" height="20" fill="currentColor"/>
              <rect x="25" y="65" width="10" height="10" fill="#121418"/>
              <rect x="45" y="20" width="10" height="10" fill="currentColor"/>
              <rect x="45" y="35" width="5" height="15" fill="currentColor"/>
              <rect x="20" y="45" width="15" height="5" fill="currentColor"/>
              <rect x="60" y="45" width="15" height="10" fill="currentColor"/>
              <rect x="45" y="60" width="10" height="10" fill="currentColor"/>
              <rect x="60" y="65" width="15" height="15" fill="currentColor"/>
            </svg>
          </div>
          
          <p class="receive-warning">Scan this QR code to transfer {currentNetwork.currencySymbol} to this account.</p>
          
          <div class="address-box" onclick={copyAddressToClipboard}>
            <span class="full-address">
              {currentNetwork.chain === "solana" ? currentAccount.solanaAddress : currentAccount.ethereumAddress}
            </span>
            <span class="copy-icon-txt">Copy</span>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if showSendModal}
    <div class="modal-overlay" onclick={() => showSendModal = false}>
      <div class="modal-card animate-fade-in" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3>Send {currentNetwork.currencySymbol}</h3>
          <button class="close-icon-btn" onclick={() => showSendModal = false}>✕</button>
        </div>
        
        <div class="modal-body">
          {#if sendSuccessHash}
            <div class="success-msg">
              Transfer complete!<br/>
              <a href={currentNetwork.explorerUrl.replace("{{tx}}", sendSuccessHash)} target="_blank" rel="noreferrer" class="tx-link">
                View Explorer ↗
              </a>
            </div>
          {:else}
            <div class="form-group">
              <label for="send-address">Recipient Address</label>
              <input 
                type="text" 
                id="send-address" 
                placeholder="Enter address" 
                bind:value={sendAddress}
                disabled={isSendingTx}
              />
            </div>
            
            <div class="form-group margin-top">
              <label for="send-amount">Amount ({currentNetwork.currencySymbol})</label>
              <input 
                type="number" 
                step="any"
                id="send-amount" 
                placeholder="0.00" 
                bind:value={sendAmount}
                disabled={isSendingTx}
              />
            </div>

            {#if sendError}
              <div class="error-msg">{sendError}</div>
            {/if}

            <button 
              class="execute-swap-btn full-width margin-top-lg" 
              onclick={handleSendTransaction}
              disabled={isSendingTx}
            >
              {isSendingTx ? "Processing..." : "Send Assets"}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if showAddAccountModal}
    <div class="modal-overlay" onclick={() => showAddAccountModal = false}>
      <div class="modal-card animate-fade-in" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3>Add New Account</h3>
          <button class="close-icon-btn" onclick={() => showAddAccountModal = false}>✕</button>
        </div>
        
        <div class="modal-body">
          <p style="font-size: 0.78rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;">
            Choose a unique username/name for your new account:
          </p>

          <div class="form-group">
            <label for="new-acc-input">Account Username / Name</label>
            <input
              type="text"
              id="new-acc-input"
              bind:value={newAccountNameInput}
              placeholder="e.g. Account 2 or satoshi_dev"
              onkeydown={(e) => e.key === "Enter" && confirmAddAccount()}
              autocomplete="off"
            />
          </div>

          {#if addAccountError}
            <div class="error-msg" style="margin-top: 0.6rem; font-size: 0.78rem; text-align: left;">{addAccountError}</div>
          {/if}

          <button 
            class="execute-swap-btn full-width margin-top-lg" 
            style="margin-top: 1rem;"
            onclick={confirmAddAccount}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .wallet-layout-shell {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    color: var(--color-text-primary);
    background-color: #0c0d10;
    position: relative;
    overflow: hidden;
  }

  /* Header Section styling */
  .wallet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.8rem;
    background-color: #0c0d10;
    border-bottom: 1px solid var(--color-border);
    z-index: 10;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .user-avatar-btn {
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    border-radius: var(--radius-full);
    overflow: hidden;
    transition: transform 0.2s;
  }

  .user-avatar-btn:hover {
    transform: scale(1.05);
  }

  .avatar-svg {
    width: 100%;
    height: 100%;
  }

  .header-account-meta {
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .user-handle {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    font-weight: 500;
    cursor: pointer;
  }

  .user-handle:hover {
    color: var(--color-text-primary);
  }

  .account-trigger {
    background: none;
    border: none;
    color: var(--color-text-primary);
    font-family: var(--font-display);
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0;
    text-align: left;
  }

  .account-trigger .chevron {
    font-size: 0.55rem;
    color: var(--color-text-muted);
  }

  .account-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 990;
    background: transparent;
  }

  .account-menu-dropdown {
    position: absolute;
    top: calc(100% + 0.4rem);
    left: 0;
    width: 200px;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg), 0 10px 30px rgba(0,0,0,0.6);
    z-index: 999;
    overflow: hidden;
  }

  .account-list {
    max-height: 220px;
    overflow-y: auto;
    padding: 0;
    margin: 0;
  }

  .account-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    padding: 0.45rem 0.65rem;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.2s;
  }

  .account-item:hover {
    background-color: var(--color-surface-hover);
  }

  .account-item.active {
    background-color: rgba(199, 242, 132, 0.08);
    border-left: 3px solid var(--color-primary);
  }

  .account-avatar {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-full);
    background-color: var(--color-border);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .account-item.active .account-avatar {
    background-color: var(--color-primary);
    color: #090a0c;
  }

  .account-details {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    margin-left: 0.45rem;
  }

  .account-name {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .account-item.active .account-name {
    color: var(--color-primary);
  }

  .account-addr {
    font-size: 0.6rem;
    color: var(--color-text-muted);
  }

  .account-active-check {
    color: var(--color-primary);
    font-weight: 900;
    font-size: 0.8rem;
    margin-left: 0.3rem;
  }

  .add-account-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
    padding: 0.55rem;
    background-color: rgba(199, 242, 132, 0.03);
    border: none;
    border-top: 1px solid var(--color-border);
    color: var(--color-primary);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .add-account-action-btn:hover {
    background-color: rgba(199, 242, 132, 0.1);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-text-secondary);
  }

  .explorer-status-icon, .adjustments-icon {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .explorer-status-icon:hover, .adjustments-icon:hover {
    color: var(--color-primary);
  }

  /* Viewport content area */
  .wallet-viewport-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.8rem;
    background-color: #0c0d10;
  }

  /* Bottom Navigation Bar styling */
  .wallet-bottom-nav {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0.5rem 0;
    background-color: #0c0d10;
    border-top: 1px solid var(--color-border);
  }

  .nav-icon-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.45rem 0.9rem;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .nav-icon-btn:hover {
    color: var(--color-primary);
    background-color: rgba(199, 242, 132, 0.08);
    border-color: rgba(199, 242, 132, 0.15);
  }

  .nav-icon-btn.active {
    color: var(--color-primary);
    background-color: rgba(199, 242, 132, 0.16);
    border-color: rgba(199, 242, 132, 0.35);
    box-shadow: 0 0 14px rgba(199, 242, 132, 0.25);
  }

  /* Welcome gm! Card Onboarding widget */
  .welcome-gm-card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 18px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: var(--shadow-sm);
    margin-bottom: 1.25rem;
  }

  .gm-illustration-wrapper {
    width: 110px;
    height: 90px;
    margin-bottom: 0.25rem;
  }

  .gm-welcome-meta {
    margin-bottom: 0.85rem;
  }

  .gm-welcome-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1.25;
    font-family: var(--font-display);
  }

  .gm-welcome-subtitle {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 0.35rem;
    line-height: 1.35;
    padding: 0 0.8rem;
  }

  .gm-welcome-actions {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    width: 100%;
  }

  .welcome-btn-primary {
    background-color: var(--color-primary);
    color: #090a0c;
    border: none;
    border-radius: var(--radius-lg);
    padding: 0.65rem;
    font-size: 0.85rem;
    font-weight: 800;
    cursor: pointer;
    width: 100%;
    transition: transform 0.2s, background-color 0.2s, box-shadow 0.2s;
  }

  .welcome-btn-primary:hover {
    background-color: var(--color-primary-hover);
    box-shadow: 0 0 16px rgba(199, 242, 132, 0.35);
    transform: translateY(-1px);
  }

  .welcome-btn-secondary {
    background-color: rgba(199, 242, 132, 0.04);
    color: var(--color-text-primary);
    border: 1px solid rgba(199, 242, 132, 0.2);
    border-radius: var(--radius-lg);
    padding: 0.65rem;
    font-size: 0.85rem;
    font-weight: 800;
    cursor: pointer;
    width: 100%;
    transition: all 0.2s;
  }

  .welcome-btn-secondary:hover {
    background-color: rgba(199, 242, 132, 0.12);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  /* Portfolio Balance Block */
  .portfolio-balance-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0.25rem 0 1rem 0;
  }

  .portfolio-usd-title {
    font-size: 2.2rem;
    font-weight: 900;
    color: var(--color-text-primary);
    font-family: var(--font-display);
    letter-spacing: -0.02em;
  }

  .portfolio-network-lbl {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.1rem;
  }

  .devnet-pill {
    background-color: rgba(199, 242, 132, 0.08);
    border: 1px solid rgba(199, 242, 132, 0.2);
    color: var(--color-primary);
    font-size: 0.6rem;
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-full);
    cursor: pointer;
    font-weight: 700;
  }

  .devnet-pill:hover {
    background-color: rgba(199, 242, 132, 0.15);
  }

  /* Action Grid Row */
  .operations-grid-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .action-grid-card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.55rem 0.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-grid-card:hover {
    border-color: var(--color-primary);
    background-color: var(--color-surface-hover);
    box-shadow: 0 0 14px rgba(199, 242, 132, 0.2);
  }

  .action-grid-card:hover .action-grid-lbl {
    color: var(--color-primary);
  }

  .action-circle-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background-color: rgba(199, 242, 132, 0.14);
    border: 1px solid rgba(199, 242, 132, 0.25);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, background-color 0.2s;
  }

  .action-grid-card:hover .action-circle-icon {
    transform: scale(1.08);
    background-color: rgba(199, 242, 132, 0.25);
  }

  .action-grid-lbl {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-text-secondary);
    transition: color 0.2s;
  }

  /* Sub-tabs styling */
  .subtabs-bar {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--color-border);
    padding: 0.25rem 0.15rem;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .subtab-item {
    background: none;
    border: none;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.25rem 0;
    transition: color 0.2s;
  }

  .subtab-item:hover {
    color: var(--color-text-secondary);
  }

  .subtab-item.active {
    color: var(--color-primary);
    font-weight: 800;
  }

  .subtab-dots {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  /* Token list Cards */
  .token-list-cards {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .token-card-row {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.65rem 0.8rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: border-color 0.2s;
  }

  .token-card-row:hover {
    border-color: #a39dfa;
  }

  .token-card-left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .token-logo-circle {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background-color: var(--color-border);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .token-card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .token-card-meta {
    display: flex;
    flex-direction: column;
  }

  .token-card-name {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .verified-badge {
    color: var(--color-primary);
    font-size: 0.65rem;
  }

  .token-card-qty {
    font-size: 0.65rem;
    color: var(--color-text-muted);
  }

  .token-card-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .token-card-usd {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .token-card-price {
    font-size: 0.65rem;
    color: var(--color-text-muted);
  }

  /* Collectibles lists */
  .nft-square-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .nft-square-card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .nft-square-media {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nft-square-meta {
    padding: 0.35rem 0.45rem;
    display: flex;
    flex-direction: column;
  }

  .nft-square-coll {
    font-size: 0.6rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    font-weight: 600;
  }

  .nft-square-id {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  /* Swap view widgets styling */
  .swap-widget-card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 18px;
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    position: relative;
    margin-bottom: 1rem;
  }

  .swap-pane {
    background-color: rgba(9, 9, 11, 0.4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.65rem 0.8rem;
  }

  .pane-title {
    font-size: 0.65rem;
    color: var(--color-text-muted);
    font-weight: 600;
  }

  .pane-input-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.25rem;
  }

  .swap-amount-input {
    background: none;
    border: none;
    color: var(--color-text-primary);
    font-size: 1.45rem;
    font-weight: 700;
    width: 60%;
    outline: none;
    padding: 0;
  }

  .swap-amount-value {
    color: var(--color-text-primary);
    font-size: 1.45rem;
    font-weight: 700;
  }

  .token-selector-pill {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    padding: 0.25rem 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
    color: var(--color-text-primary);
    font-weight: 700;
    font-size: 0.75rem;
  }

  .token-selector-pill:hover {
    border-color: var(--color-primary);
  }

  .pill-logo {
    width: 14px;
    height: 14px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.5rem;
    font-weight: 900;
    color: #fff;
  }

  .pill-logo.solana { background: linear-gradient(135deg, #14f195, #9945FF); }
  .pill-logo.hype { background: linear-gradient(135deg, var(--color-primary), #10b981); color: #000; }

  .pane-balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.45rem;
    font-size: 0.65rem;
    color: var(--color-text-muted);
  }

  .percent-pills {
    display: flex;
    gap: 0.35rem;
  }

  .pct-pill {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    border-radius: var(--radius-sm);
    padding: 0.15rem 0.35rem;
    font-size: 0.6rem;
    cursor: pointer;
    font-weight: 700;
  }

  .pct-pill:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .swap-toggle-overlay {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 5;
  }

  .swap-toggle-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background-color: var(--color-primary);
    border: 3px solid #0c0d10;
    color: #090a0c;
    font-size: 0.85rem;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .swap-toggle-btn:hover {
    transform: rotate(180deg);
  }

  .execute-swap-btn {
    background-color: var(--color-primary);
    color: #090a0c;
    border: none;
    border-radius: var(--radius-lg);
    padding: 0.65rem;
    font-size: 0.85rem;
    font-weight: 800;
    cursor: pointer;
    width: 100%;
    transition: background-color 0.2s;
    margin-top: 0.25rem;
  }

  .execute-swap-btn:hover {
    background-color: var(--color-primary-hover);
  }

  .swap-subtabs-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.6rem;
  }

  .swap-subtabs-left {
    display: flex;
    gap: 0.6rem;
  }

  .swap-subtab {
    background: none;
    border: none;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.15rem 0;
  }

  .swap-subtab.active {
    color: var(--color-text-primary);
  }

  .see-more-link {
    font-size: 0.7rem;
    color: var(--color-primary);
    cursor: pointer;
    font-weight: 700;
  }

  /* Filter Badges styling */
  .filter-badges-row {
    display: flex;
    gap: 0.45rem;
    margin-bottom: 0.75rem;
  }

  .filter-badge {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    border-radius: var(--radius-md);
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
  }

  .filter-badge:hover {
    border-color: var(--color-primary);
    color: var(--color-text-primary);
  }

  .filter-badge .chevron {
    font-size: 0.5rem;
    color: var(--color-text-muted);
  }

  /* Trending listings */
  .trending-tokens-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .trending-row {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.55rem 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .trending-row:hover {
    border-color: var(--color-primary);
  }

  .trend-left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .trend-avatar-circle {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 900;
    color: #fff;
  }

  .trend-avatar-circle.jim { background: radial-gradient(circle, #f59e0b, #b45309); }
  .trend-avatar-circle.mouse { background: radial-gradient(circle, #3b82f6, #1d4ed8); }

  .trend-meta {
    display: flex;
    flex-direction: column;
  }

  .trend-name {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .trend-cap {
    font-size: 0.65rem;
    color: var(--color-text-muted);
  }

  .trend-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .trend-val {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .trend-change {
    font-size: 0.65rem;
    font-weight: 700;
  }

  .trend-change.positive { color: var(--color-success); }
  .trend-change.negative { color: var(--color-error); }

  /* Explore view elements */
  .explore-search-container {
    position: relative;
    width: 100%;
    margin-bottom: 0.85rem;
  }

  .search-input-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
  }

  .explore-search-input {
    width: 100%;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.55rem 0.8rem 0.55rem 2.2rem;
    font-size: 0.8rem;
    color: var(--color-text-primary);
    outline: none;
  }

  .explore-search-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary);
  }

  .category-scroll-row {
    display: flex;
    gap: 0.45rem;
    margin-bottom: 1.1rem;
  }

  .category-pill {
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-md);
    font-size: 0.72rem;
    font-weight: 700;
    background-color: var(--color-surface);
  }

  .category-pill.tokens { color: var(--color-primary); }
  .category-pill.perps { color: #f472b6; }
  .category-pill.lists { color: var(--color-primary); }

  .explore-featured-card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.85rem;
    margin-bottom: 1.25rem;
  }

  .featured-header {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 0.75rem;
  }

  .featured-icon {
    font-size: 1.25rem;
  }

  .featured-meta {
    display: flex;
    flex-direction: column;
  }

  .featured-title {
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--color-text-primary);
  }

  .featured-subtitle {
    font-size: 0.65rem;
    color: var(--color-text-muted);
  }

  .featured-action-btn {
    width: 100%;
    padding: 0.45rem;
    background-color: rgba(199, 242, 132, 0.08);
    border: 1px solid rgba(199, 242, 132, 0.25);
    color: var(--color-primary);
    border-radius: var(--radius-md);
    font-size: 0.75rem;
    font-weight: 800;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .featured-action-btn:hover {
    background-color: rgba(199, 242, 132, 0.18);
  }

  .explore-section-title {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--color-text-primary);
    margin-bottom: 0.55rem;
  }

  /* Activity Ledger Rows */
  .activities-ledger {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .activity-card-row {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.55rem 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .act-card-left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .act-card-badge {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    border: 1px solid var(--color-border);
  }

  .act-card-badge.receive { background-color: rgba(16, 185, 129, 0.1); color: var(--color-success); }
  .act-card-badge.send { background-color: rgba(239, 68, 68, 0.1); color: var(--color-error); }
  .act-card-badge.swap { background-color: rgba(245, 158, 11, 0.1); color: var(--color-warning); }
  .act-card-badge.airdrop, .act-card-badge.stake { background-color: rgba(199, 242, 132, 0.12); color: var(--color-primary); }

  .act-card-text {
    display: flex;
    flex-direction: column;
  }

  .act-card-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .act-card-time {
    font-size: 0.65rem;
    color: var(--color-text-muted);
  }

  .act-card-amount {
    font-size: 0.75rem;
    font-weight: 700;
  }

  .act-card-amount.income { color: var(--color-success); }
  .act-card-amount.outcome { color: var(--color-text-primary); }

  /* Modals overrides */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-card {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 18px;
    width: 310px;
    padding: 1.1rem;
    box-shadow: var(--shadow-lg);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.85rem;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.45rem;
  }

  .modal-header h3 {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
  }

  .close-icon-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    cursor: pointer;
  }

  .close-icon-btn:hover {
    color: var(--color-text-primary);
  }

  .qr-code-placeholder {
    width: 120px;
    height: 120px;
    background-color: white;
    color: #0c0d10;
    border-radius: var(--radius-md);
    margin: 0.35rem auto 0.85rem auto;
    padding: 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .address-box {
    background-color: rgba(9, 9, 11, 0.8);
    border: 1px solid var(--color-border);
    padding: 0.55rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.68rem;
    gap: 0.45rem;
  }

  .address-box:hover {
    border-color: var(--color-primary);
  }

  .full-address {
    font-family: monospace;
    color: var(--color-text-primary);
    word-break: break-all;
    text-align: left;
    max-width: 80%;
  }

  .copy-icon-txt {
    font-weight: 700;
    color: var(--color-primary);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group.margin-top {
    margin-top: 0.65rem;
  }

  .form-group label {
    font-size: 0.72rem;
    color: var(--color-text-secondary);
    font-weight: 600;
  }

  .form-group input {
    font-size: 0.82rem;
    padding: 0.45rem 0.6rem;
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: #fff;
    outline: none;
  }

  .form-group input:focus {
    border-color: var(--color-primary);
  }
</style>
