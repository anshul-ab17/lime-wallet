<script lang="ts">
  let { solBalance, onStakeSuccess, logAction } = $props<{
    solBalance: number;
    onStakeSuccess: (amount: number) => void;
    logAction: (msg: string) => void;
  }>();

  let amount = $state("");
  let isStaking = $state(false);
  let status = $state("");
  
  let stakedAmount = $state(0);
  let rewardsAccumulated = $state(0);

  // Derive APY
  const APY = 6.85;

  function handleStake() {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    if (val > solBalance) {
      status = "Insufficient SOL balance";
      return;
    }

    isStaking = true;
    status = "";
    logAction(`Initiating Solana Staking xNFT: Staking ${val} SOL...`);

    setTimeout(() => {
      isStaking = false;
      stakedAmount += val;
      onStakeSuccess(val);
      logAction(`Successfully staked ${val} SOL on Solana Devnet validators.`);
      amount = "";
      status = `Staked ${val} SOL successfully!`;
      setTimeout(() => { status = ""; }, 3000);
    }, 2500);
  }

  // Simulate reward accumulation periodically in the UI
  $effect(() => {
    const interval = setInterval(() => {
      if (stakedAmount > 0) {
        // Accumulate a small reward amount
        const tickReward = (stakedAmount * (APY / 100)) / (365 * 24 * 3600); // per-second reward approx
        rewardsAccumulated += tickReward * 10; // Speed up representation
      }
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

<div class="staking-xnft animate-fade-in">
  <div class="xnft-header">
    <div class="xnft-badge">xNFT</div>
    <h4>Lime Stake</h4>
  </div>

  <div class="stats-grid">
    <div class="stat-box">
      <span class="label">Staked</span>
      <span class="value">{stakedAmount.toFixed(4)} SOL</span>
    </div>
    <div class="stat-box">
      <span class="label">Rewards</span>
      <span class="value success-text">+{rewardsAccumulated.toFixed(8)} SOL</span>
    </div>
    <div class="stat-box">
      <span class="label">APY</span>
      <span class="value highlight-text">{APY}%</span>
    </div>
  </div>

  <div class="staking-form">
    <div class="input-row">
      <input
        type="number"
        bind:value={amount}
        placeholder="SOL amount to stake"
        disabled={isStaking}
      />
      <button class="primary" onclick={handleStake} disabled={isStaking || !amount || parseFloat(amount) <= 0}>
        {isStaking ? "Staking..." : "Stake"}
      </button>
    </div>

    {#if status}
      <div class="status-msg {status.includes('successfully') ? 'success' : 'error'}">
        {status}
      </div>
    {/if}
  </div>
</div>

<style>
  .staking-xnft {
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

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
    margin-bottom: 0.75rem;
  }

  .stat-box {
    background-color: rgba(9, 9, 11, 0.4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-box .label {
    font-size: 0.6rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .stat-box .value {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-top: 0.15rem;
  }

  .success-text {
    color: var(--color-success) !important;
  }

  .highlight-text {
    color: var(--color-primary) !important;
  }

  .staking-form {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .input-row {
    display: flex;
    gap: 0.4rem;
  }

  .input-row input {
    flex-grow: 1;
    font-size: 0.85rem;
    padding: 0.4rem 0.6rem;
  }

  .input-row button {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }

  .status-msg {
    font-size: 0.7rem;
    text-align: center;
    padding: 0.25rem;
    border-radius: var(--radius-sm);
  }

  .status-msg.success {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--color-success);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .status-msg.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--color-error);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
</style>
