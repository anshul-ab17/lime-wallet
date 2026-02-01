<script lang="ts">
  let { activeNetworkId, solBalance, ethBalance, onSwapSuccess, logAction } = $props<{
    activeNetworkId: string;
    solBalance: number;
    ethBalance: number;
    onSwapSuccess: (chain: "solana" | "ethereum", amountFrom: number, tokenFrom: string, amountTo: number, tokenTo: string) => void;
    logAction: (msg: string) => void;
  }>();

  let tokenFrom = $state("SOL");
  let tokenTo = $state("USDC");

  $effect(() => {
    tokenFrom = activeNetworkId.startsWith("solana") ? "SOL" : "ETH";
  });
  
  let amountFrom = $state("");
  let amountTo = $derived.by(() => {
    const val = parseFloat(amountFrom);
    if (isNaN(val) || val <= 0) return "";
    
    // Swap rates
    const rates: Record<string, number> = {
      "SOL-USDC": 142.50,
      "USDC-SOL": 1 / 142.50,
      "ETH-USDC": 3120.00,
      "USDC-ETH": 1 / 3120.00,
      "SOL-JUP": 128.4,
      "JUP-SOL": 1 / 128.4,
      "ETH-USDC-mock": 3120
    };
    
    const key = `${tokenFrom}-${tokenTo}`;
    if (rates[key]) return (val * rates[key]).toFixed(4);
    
    // Default fallback
    return (val * 1.5).toFixed(4);
  });

  let isSwapping = $state(false);
  let statusMsg = $state("");

  // Get max balance for the current selected "From" token
  let maxBalance = $derived.by(() => {
    if (tokenFrom === "SOL") return solBalance;
    if (tokenFrom === "ETH") return ethBalance;
    if (tokenFrom === "USDC") return 150.00; // Mock USDC balance
    return 0;
  });

  function setMax() {
    amountFrom = maxBalance.toFixed(4);
  }

  function handleSwitch() {
    const temp = tokenFrom;
    tokenFrom = tokenTo;
    tokenTo = temp;
    amountFrom = "";
  }

  async function performSwap() {
    const valFrom = parseFloat(amountFrom);
    const valTo = parseFloat(amountTo);
    if (isNaN(valFrom) || valFrom <= 0) return;
    
    if (valFrom > maxBalance) {
      statusMsg = "Insufficient balance";
      return;
    }

    isSwapping = true;
    statusMsg = "";
    logAction(`Initiating xNFT Coral Swap: ${valFrom} ${tokenFrom} -> ${valTo} ${tokenTo}`);

    // Simulate block time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    isSwapping = false;
    logAction(`xNFT Swap confirmed. Signatures checked.`);
    onSwapSuccess(
      activeNetworkId.startsWith("solana") ? "solana" : "ethereum",
      valFrom,
      tokenFrom,
      valTo,
      tokenTo
    );
    
    amountFrom = "";
    statusMsg = "Swap successful!";
    setTimeout(() => { statusMsg = ""; }, 3000);
  }
</script>

<div class="swap-xnft animate-fade-in">
  <div class="xnft-header">
    <div class="xnft-badge">xNFT</div>
    <h4>Coral Swap</h4>
  </div>

  <div class="swap-box">
    <!-- From block -->
    <div class="token-input-block">
      <div class="row">
        <span>From</span>
        <span class="balance" onclick={setMax}>Balance: {maxBalance.toFixed(4)} (Max)</span>
      </div>
      <div class="row input-row">
        <input type="number" bind:value={amountFrom} placeholder="0.0" disabled={isSwapping} />
        <select bind:value={tokenFrom} disabled={isSwapping}>
          {#if activeNetworkId.startsWith("solana")}
            <option value="SOL">SOL</option>
            <option value="USDC">USDC</option>
            <option value="JUP">JUP</option>
          {:else}
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>
          {/if}
        </select>
      </div>
    </div>

    <!-- Swap middle button -->
    <div class="switch-row">
      <button class="icon switch-btn" onclick={handleSwitch} disabled={isSwapping}>
        ⇅
      </button>
    </div>

    <!-- To block -->
    <div class="token-input-block">
      <div class="row">
        <span>To</span>
      </div>
      <div class="row input-row">
        <input type="text" value={amountTo} placeholder="0.0" readonly />
        <select bind:value={tokenTo} disabled={isSwapping}>
          {#if activeNetworkId.startsWith("solana")}
            <option value="USDC">USDC</option>
            <option value="SOL">SOL</option>
            <option value="JUP">JUP</option>
          {:else}
            <option value="USDC">USDC</option>
            <option value="ETH">ETH</option>
          {/if}
        </select>
      </div>
    </div>

    {#if statusMsg}
      <div class="status-alert {statusMsg.includes('successful') ? 'success' : 'error'}">
        {statusMsg}
      </div>
    {/if}

    <button class="primary full-width" onclick={performSwap} disabled={isSwapping || !amountFrom || parseFloat(amountFrom) <= 0}>
      {isSwapping ? "Swapping tokens..." : "Swap"}
    </button>
  </div>
</div>

<style>
  .swap-xnft {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.75rem;
    margin-bottom: 1rem;
    box-shadow: var(--shadow-sm);
  }

  .xnft-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.5rem;
  }

  .xnft-badge {
    background-color: var(--color-primary);
    color: #090a0c;
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.1rem 0.35rem;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  h4 {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .swap-box {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .token-input-block {
    background-color: rgba(9, 9, 11, 0.4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.6rem;
  }

  .token-input-block .row {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--color-text-secondary);
  }

  .token-input-block .balance {
    cursor: pointer;
    font-weight: 500;
  }

  .token-input-block .balance:hover {
    color: var(--color-primary);
  }

  .input-row {
    margin-top: 0.25rem;
    align-items: center;
    gap: 0.5rem;
  }

  .input-row input {
    background: transparent;
    border: none;
    padding: 0;
    width: 65%;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .input-row input:focus {
    box-shadow: none;
    border: none;
  }

  .input-row select {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 0.2rem 0.4rem;
    width: 35%;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
  }

  .switch-row {
    display: flex;
    justify-content: center;
    margin: -0.25rem 0;
    z-index: 2;
  }

  .switch-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border);
    background-color: var(--color-surface-hover);
    color: var(--color-text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    transition: all 0.2s;
  }

  .switch-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    transform: scale(1.1);
  }

  .status-alert {
    font-size: 0.75rem;
    padding: 0.4rem;
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .status-alert.success {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--color-success);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .status-alert.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--color-error);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .full-width {
    width: 100%;
    font-size: 0.8rem;
    padding: 0.5rem;
  }
</style>
