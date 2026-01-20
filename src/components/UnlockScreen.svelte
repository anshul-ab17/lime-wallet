<script lang="ts">
  import { verifyPassword, clearWallet } from "../utils/crypto";

  let { onUnlock, logAction } = $props<{
    onUnlock: (password: string) => void;
    logAction: (msg: string) => void;
  }>();

  let password = $state("");
  let error = $state("");
  let showResetConfirm = $state(false);

  async function handleUnlock() {
    if (!password) return;
    try {
      logAction("Verifying password...");
      const isValid = await verifyPassword(password);
      if (isValid) {
        logAction("Password verified successfully. Wallet unlocked.");
        onUnlock(password);
      } else {
        error = "Incorrect password.";
        logAction("Unlock failed: Incorrect password.");
      }
    } catch (e: any) {
      error = e.message || "Failed to unlock.";
      logAction(`Unlock error: ${error}`);
    }
  }

  function handleResetWallet() {
    clearWallet();
    logAction("Wallet reset complete. LocalStorage cleared.");
    window.location.reload();
  }
</script>

<div class="unlock-container animate-fade-in">
  <div class="logo-area">
    <div class="brand-logo">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="unlockRindGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#d5f7a3" />
            <stop offset="40%" stop-color="#a4db44" />
            <stop offset="85%" stop-color="#699c15" />
            <stop offset="100%" stop-color="#41630b" />
          </radialGradient>
          <radialGradient id="unlockPulpGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#1b1e22" />
            <stop offset="85%" stop-color="#121418" />
            <stop offset="100%" stop-color="#1c2b12" />
          </radialGradient>
        </defs>
        <path d="M 15,35 C 10,65 30,85 50,85 C 70,85 90,65 85,35 C 80,48 20,48 15,35 Z" fill="url(#unlockRindGrad)" />
        <g transform="translate(50, 40) rotate(-22) scale(1, 0.52) translate(-50, -50)">
          <circle cx="50" cy="50" r="37" fill="url(#unlockPulpGrad)" stroke="#c7f284" stroke-width="4.5"/>
          <line x1="50" y1="13" x2="50" y2="87" stroke="#c7f284" stroke-width="2.5" opacity="0.95"/>
          <line x1="13" y1="50" x2="87" y2="50" stroke="#c7f284" stroke-width="2.5" opacity="0.95"/>
          <line x1="23.8" y1="23.8" x2="76.2" y2="76.2" stroke="#c7f284" stroke-width="2.5" opacity="0.95"/>
          <line x1="23.8" y1="76.2" x2="76.2" y2="23.8" stroke="#c7f284" stroke-width="2.5" opacity="0.95"/>
          <circle cx="50" cy="50" r="30" fill="none" stroke="#c7f284" stroke-width="1.5" stroke-dasharray="2 3" opacity="0.8"/>
          <circle cx="50" cy="50" r="5" fill="#c7f284"/>
        </g>
      </svg>
    </div>
    <h1>LIME WALLET</h1>
    <p class="subtitle">Locked</p>
  </div>

  {#if !showResetConfirm}
    <div class="unlock-form">
      <div class="form-group">
        <input
          type="password"
          bind:value={password}
          placeholder="Enter password to unlock"
          onkeydown={(e) => e.key === "Enter" && handleUnlock()}
          autofocus
        />
      </div>

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <button class="primary full-width" onclick={handleUnlock} disabled={!password}>
        Unlock
      </button>

      <button class="secondary text-button" onclick={() => showResetConfirm = true}>
        Reset Wallet
      </button>
    </div>
  {:else}
    <div class="reset-confirm">
      <h3>Are you sure?</h3>
      <p class="warn-desc">
        Resetting your wallet will clear all secure data stored on this device. You can only recover your account if you have your Secret Recovery Phrase.
      </p>

      <div class="actions">
        <button class="danger full-width" onclick={handleResetWallet}>
          Yes, Reset Wallet
        </button>
        <button class="secondary full-width" onclick={() => showResetConfirm = false}>
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .unlock-container {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }

  .logo-area {
    text-align: center;
    margin-top: 2rem;
    margin-bottom: 2rem;
  }

  .brand-logo {
    width: 72px;
    height: 72px;
    color: var(--color-primary);
    margin: 0 auto 0.75rem auto;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--color-text-primary);
  }

  .subtitle {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
  }

  .unlock-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex-grow: 1;
    justify-content: center;
  }

  .form-group {
    margin-bottom: 0.5rem;
  }

  .error-msg {
    color: var(--color-error);
    font-size: 0.8rem;
    background-color: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    padding: 0.6rem 0.8rem;
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .text-button {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 0.8rem;
    cursor: pointer;
    font-weight: 500;
    margin-top: 0.5rem;
  }

  .text-button:hover {
    color: var(--color-error);
    background: transparent;
  }

  .reset-confirm {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex-grow: 1;
    justify-content: center;
    text-align: center;
  }

  .reset-confirm h3 {
    color: var(--color-error);
    font-family: var(--font-display);
  }

  .warn-desc {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .full-width {
    width: 100%;
  }
</style>
