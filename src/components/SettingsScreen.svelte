<script lang="ts">
  import { verifyPassword, getMnemonic, clearWallet } from "../utils/crypto";
  import { NETWORKS, type WalletAccount } from "../utils/wallet";

  let { 
    account, 
    activeNetworkId, 
    onClose, 
    onNetworkChange, 
    onAddAccount, 
    onUpdateAccountName,
    onLock,
    logAction 
  } = $props<{
    account: WalletAccount;
    activeNetworkId: string;
    onClose: () => void;
    onNetworkChange: (netId: string) => void;
    onAddAccount: () => void;
    onUpdateAccountName: (index: number, newName: string) => Promise<void>;
    onLock: () => void;
    logAction: (msg: string) => void;
  }>();

  let subView = $state("menu"); // "menu" | "seed" | "keys" | "network" | "profile"
  let passwordInput = $state("");
  let decryptedSeed = $state("");
  let isCopied = $state(false);
  let showKeys = $state(false);
  let error = $state("");
  let isSeedRevealed = $state(true);
  let editNameInput = $state("");
  let profileSuccessMsg = $state("");

  async function handleRevealSeed() {
    try {
      const isValid = await verifyPassword(passwordInput);
      if (!isValid) {
        error = "Incorrect password.";
        logAction("Reveal seed failed: Incorrect password.");
        return;
      }
      error = "";
      decryptedSeed = await getMnemonic(passwordInput);
      logAction("Mnemonic phrase successfully revealed in settings.");
      passwordInput = "";
    } catch (e: any) {
      error = e.message || "Failed to reveal seed.";
    }
  }

  async function handleRevealKeys() {
    try {
      const isValid = await verifyPassword(passwordInput);
      if (!isValid) {
        error = "Incorrect password.";
        logAction("Reveal private keys failed: Incorrect password.");
        return;
      }
      error = "";
      showKeys = true;
      logAction(`Private keys revealed for account: ${account.name}`);
      passwordInput = "";
    } catch (e: any) {
      error = e.message || "Failed to reveal keys.";
    }
  }

  function handleCopySeed() {
    navigator.clipboard.writeText(decryptedSeed);
    isCopied = true;
    setTimeout(() => isCopied = false, 2000);
  }

  function handleCopyKey(key: string) {
    navigator.clipboard.writeText(key);
    logAction("Private key copied to clipboard.");
  }

  function handleReset() {
    if (confirm("Are you absolutely sure you want to reset your wallet? All keys will be deleted!")) {
      clearWallet();
      logAction("Wallet reset triggered from Settings.");
      window.location.reload();
    }
  }

  async function handleSaveProfileName() {
    try {
      error = "";
      profileSuccessMsg = "";
      await onUpdateAccountName(account.index, editNameInput);
      profileSuccessMsg = "Username updated successfully!";
      setTimeout(() => profileSuccessMsg = "", 3000);
    } catch (e: any) {
      error = e.message || "Failed to update username.";
    }
  }

  function handleBack() {
    error = "";
    passwordInput = "";
    decryptedSeed = "";
    showKeys = false;
    profileSuccessMsg = "";
    subView = "menu";
  }
</script>

<div class="settings-view animate-fade-in">
  <div class="settings-header">
    <button class="icon" onclick={subView === "menu" ? onClose : handleBack}>&larr;</button>
    <h2>
      {#if subView === "menu"}Settings{:else if subView === "profile"}Edit Username{:else if subView === "seed"}Secret Recovery Phrase{:else if subView === "keys"}Private Keys{:else if subView === "network"}Change Network{/if}
    </h2>
  </div>

  <div class="settings-content">
    {#if subView === "menu"}
      <div class="menu-list">
        <button class="menu-item" onclick={() => { editNameInput = account.name; error = ""; profileSuccessMsg = ""; subView = "profile"; }}>
          <span class="menu-label-with-icon">
            <svg class="menu-svg-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Edit Username ({account.name})
          </span>
          <span>&rarr;</span>
        </button>

        <button class="menu-item" onclick={() => subView = "seed"}>
          <span class="menu-label-with-icon">
            <svg class="menu-svg-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="7.5" cy="16.5" r="2.5"></circle>
              <path d="M9.5 14.5L16 8l3 3m-1.5-1.5L19 8"></path>
            </svg>
            Secret Recovery Phrase
          </span>
          <span>&rarr;</span>
        </button>

        <button class="menu-item" onclick={() => subView = "keys"}>
          <span class="menu-label-with-icon">
            <svg class="menu-svg-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0110 0v4"></path>
            </svg>
            Export Private Keys
          </span>
          <span>&rarr;</span>
        </button>

        <button class="menu-item" onclick={() => subView = "network"}>
          <span class="menu-label-with-icon">
            <svg class="menu-svg-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path>
            </svg>
            Network Configuration
          </span>
          <span class="active-badge">{NETWORKS[activeNetworkId]?.name || "Select"} &rarr;</span>
        </button>

        <button class="menu-item accent-item" onclick={onAddAccount}>
          <span class="menu-label-with-icon">
            <svg class="menu-svg-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Account
          </span>
          <span>&rarr;</span>
        </button>

        <button class="menu-item text-danger" onclick={onLock}>
          <span class="menu-label-with-icon">
            <svg class="menu-svg-icon danger-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0110 0v4"></path>
            </svg>
            Lock Wallet
          </span>
          <span>&rarr;</span>
        </button>

        <button class="menu-item text-danger" onclick={handleReset}>
          <span class="menu-label-with-icon">
            <svg class="menu-svg-icon danger-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Reset Wallet
          </span>
          <span>&rarr;</span>
        </button>
      </div>
    {:else if subView === "profile"}
      <div class="pwd-prompt">
        <p>Enter a unique username/display name for this account.</p>
        <div class="form-group">
          <input
            type="text"
            bind:value={editNameInput}
            placeholder="e.g. satoshi or alex"
            onkeydown={(e) => e.key === "Enter" && handleSaveProfileName()}
          />
        </div>
        {#if error}
          <div class="error-msg">{error}</div>
        {/if}
        {#if profileSuccessMsg}
          <div class="success-banner">{profileSuccessMsg}</div>
        {/if}
        <button class="primary full-width" onclick={handleSaveProfileName} disabled={!editNameInput.trim() || editNameInput.trim() === account.name}>
          Save Username
        </button>
      </div>
    {:else if subView === "seed"}
      {#if !decryptedSeed}
        <div class="pwd-prompt">
          <p>Please enter your wallet password to reveal your recovery phrase.</p>
          <input
            type="password"
            bind:value={passwordInput}
            placeholder="Wallet password"
            onkeydown={(e) => e.key === "Enter" && handleRevealSeed()}
          />
          {#if error}
            <div class="error-msg">{error}</div>
          {/if}
          <button class="primary full-width" onclick={handleRevealSeed} disabled={!passwordInput}>
            Reveal Phrase
          </button>
        </div>
      {:else}
        <div class="seed-display">
          <p class="recovery-warning-text">
            This phrase is the ONLY way to recover your wallet. Do NOT share it with anyone!
          </p>

          <div class="mnemonic-blur-wrapper">
            <div class="mnemonic-grid {!isSeedRevealed ? 'blurred' : ''}">
              {#each decryptedSeed.trim().split(/\s+/) as word, i}
                <div class="word-chip">
                  <span class="index">{i + 1}</span>
                  <span class="word">{word}</span>
                </div>
              {/each}
            </div>

            {#if !isSeedRevealed}
              <div class="reveal-overlay" onclick={() => isSeedRevealed = true}>
                <div class="eye-icon-button">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </div>
              </div>
            {/if}
          </div>

          <button class="copy-link-btn" onclick={handleCopySeed}>
            {isCopied ? "✓ Copied Phrase!" : "Copy to Clipboard"}
          </button>

          <div class="warning-banner">
            <strong>WARNING:</strong> Keep this phrase offline. Anyone with this phrase can steal all your funds.
          </div>
        </div>
      {/if}
    {:else if subView === "keys"}
      {#if !showKeys}
        <div class="pwd-prompt">
          <p>Please enter your wallet password to reveal private keys.</p>
          <input
            type="password"
            bind:value={passwordInput}
            placeholder="Wallet password"
            onkeydown={(e) => e.key === "Enter" && handleRevealKeys()}
          />
          {#if error}
            <div class="error-msg">{error}</div>
          {/if}
          <button class="primary full-width" onclick={handleRevealKeys} disabled={!passwordInput}>
            Reveal Keys
          </button>
        </div>
      {:else}
        <div class="keys-display">
          <div class="key-section">
            <span class="chain-title solana">Solana Private Key</span>
            <div class="key-box" onclick={() => handleCopyKey(account.solanaPrivateKey)}>
              <span class="key-text">{account.solanaPrivateKey}</span>
              <span class="copy-hint">Click to copy</span>
            </div>
          </div>

          <div class="key-section">
            <span class="chain-title ethereum">Ethereum Private Key</span>
            <div class="key-box" onclick={() => handleCopyKey(account.ethereumPrivateKey)}>
              <span class="key-text">{account.ethereumPrivateKey}</span>
              <span class="copy-hint">Click to copy</span>
            </div>
          </div>

          <div class="warning-banner">
            <strong>WARNING:</strong> Never share your private keys. They give full control of your accounts.
          </div>
        </div>
      {/if}
    {:else if subView === "network"}
      <div class="network-select">
        <p class="select-desc">Select the network to use in your Backpack wallet</p>
        
        <div class="network-group">
          <h5>Solana</h5>
          {#each Object.values(NETWORKS).filter(n => n.chain === "solana") as net}
            <button
              class="network-row {activeNetworkId === net.id ? 'active' : ''}"
              onclick={() => onNetworkChange(net.id)}
            >
              <div class="net-name">
                <span class="bullet solana"></span>
                {net.name}
              </div>
              {#if activeNetworkId === net.id}
                <span class="check-mark">✓</span>
              {/if}
            </button>
          {/each}
        </div>

        <div class="network-group">
          <h5>Ethereum</h5>
          {#each Object.values(NETWORKS).filter(n => n.chain === "ethereum") as net}
            <button
              class="network-row {activeNetworkId === net.id ? 'active' : ''}"
              onclick={() => onNetworkChange(net.id)}
            >
              <div class="net-name">
                <span class="bullet ethereum"></span>
                {net.name}
              </div>
              {#if activeNetworkId === net.id}
                <span class="check-mark">✓</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .settings-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .settings-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 1rem;
  }

  .settings-header h2 {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .settings-content {
    flex-grow: 1;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .menu-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .menu-item {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    width: 100%;
    text-align: left;
    padding: 0.85rem 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text-primary);
    border-radius: var(--radius-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .menu-item:hover {
    background-color: var(--color-surface-hover);
    border-color: rgba(199, 242, 132, 0.3);
  }

  .menu-label-with-icon {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .menu-svg-icon {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .menu-svg-icon.danger-svg {
    color: var(--color-error);
  }

  .accent-item {
    border-color: rgba(199, 242, 132, 0.2);
  }
  .accent-item:hover {
    border-color: var(--color-primary);
  }

  .active-badge {
    font-size: 0.7rem;
    background-color: rgba(255, 255, 255, 0.05);
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
  }

  .text-danger {
    color: var(--color-error);
  }
  .text-danger:hover {
    background-color: rgba(239, 68, 68, 0.05);
    border-color: rgba(239, 68, 68, 0.2);
  }

  .pwd-prompt {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
    padding-top: 1rem;
  }

  .pwd-prompt p {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .seed-display, .keys-display {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .recovery-warning-text {
    text-align: center;
    color: var(--color-warning);
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.45;
    margin: 0 auto 0.5rem auto;
  }

  .mnemonic-blur-wrapper {
    position: relative;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background-color: rgba(9, 9, 11, 0.4);
    overflow: hidden;
  }

  .mnemonic-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.45rem;
    padding: 0.75rem;
    transition: filter 0.3s ease;
  }

  .mnemonic-grid.blurred {
    filter: blur(6px);
    pointer-events: none;
  }

  .reveal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.25);
    cursor: pointer;
    z-index: 10;
  }

  .eye-icon-button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.75);
    border: 1px solid rgba(199, 242, 132, 0.3);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(0,0,0,0.6);
    transition: transform 0.2s, background-color 0.2s;
  }

  .eye-icon-button:hover {
    transform: scale(1.08);
    background-color: rgba(0, 0, 0, 0.9);
  }

  .word-chip {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 0.45rem 0.5rem;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
  }

  .word-chip .index {
    color: var(--color-text-muted);
    font-size: 0.72rem;
    font-weight: 600;
  }

  .word-chip .word {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .copy-link-btn {
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    border-radius: var(--radius-md);
    padding: 0.55rem;
    transition: all 0.2s;
  }

  .copy-link-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background-color: rgba(199, 242, 132, 0.05);
  }

  .warning-banner {
    background-color: rgba(245, 158, 11, 0.06);
    border: 1px solid rgba(245, 158, 11, 0.2);
    color: var(--color-warning);
    font-size: 0.75rem;
    padding: 0.6rem 0.8rem;
    border-radius: var(--radius-md);
    line-height: 1.4;
  }

  .key-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .chain-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .chain-title.solana {
    color: var(--color-solana);
  }
  .chain-title.ethereum {
    color: var(--color-ethereum);
  }

  .key-box {
    background-color: rgba(9, 9, 11, 0.6);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.6rem 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .key-box:hover {
    border-color: var(--color-primary);
  }

  .key-text {
    font-family: monospace;
    font-size: 0.7rem;
    color: var(--color-text-primary);
    word-break: break-all;
  }

  .copy-hint {
    font-size: 0.6rem;
    color: var(--color-text-muted);
    text-align: right;
  }

  .network-select {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .select-desc {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  .network-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .network-group h5 {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.15rem;
  }

  .network-row {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    cursor: pointer;
    transition: all 0.2s;
  }

  .network-row:hover {
    background-color: var(--color-surface-hover);
  }

  .network-row.active {
    border-color: var(--color-primary);
    background-color: rgba(199, 242, 132, 0.05);
  }

  .net-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .bullet {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
  }

  .bullet.solana {
    background-color: var(--color-solana);
  }

  .bullet.ethereum {
    background-color: var(--color-ethereum);
  }

  .check-mark {
    color: var(--color-primary);
    font-weight: 700;
    font-size: 0.9rem;
  }

  .error-msg {
    color: var(--color-error);
    font-size: 0.8rem;
    margin-top: 0.25rem;
    text-align: center;
  }

  .success-banner {
    color: var(--color-primary);
    background-color: rgba(199, 242, 132, 0.08);
    border: 1px solid rgba(199, 242, 132, 0.25);
    font-size: 0.8rem;
    padding: 0.6rem 0.8rem;
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .full-width {
    width: 100%;
  }
</style>
