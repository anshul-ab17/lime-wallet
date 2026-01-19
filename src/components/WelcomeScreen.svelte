<script lang="ts">
  import { generateMnemonic } from "bip39";
  import { setupWallet } from "../utils/crypto";

  // Svelte 5 props
  let { onComplete, logAction } = $props<{
    onComplete: (password: string) => void;
    logAction: (msg: string) => void;
  }>();

  // Runes for reactive state
  let step = $state("intro"); // "intro" | "generate" | "import" | "password"
  let mnemonic = $state("");
  let inputMnemonic = $state("");
  let username = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let error = $state("");
  let isCopied = $state(false);

  // Security checkboxes & Word count toggle
  let hasSavedPhrase = $state(false);
  let isRevealed = $state(false); // Toggle visibility blur
  let is24Words = $state(false); // Toggle 12 or 24 words grid

  // Word inputs array for Import screen
  let importWords = $state<string[]>(Array(12).fill(""));

  // Get word array for UI display of generated phrase
  let words = $derived(mnemonic ? mnemonic.split(" ") : []);

  // Check if all import fields are filled
  let allImportWordsFilled = $derived.by(() => {
    return importWords.every(word => word.trim().length > 0);
  });

  function handleCreateNew() {
    mnemonic = generateMnemonic();
    logAction("Generated new 12-word mnemonic seed phrase.");
    step = "generate";
  }

  function handleImport() {
    logAction("Navigated to import seed phrase screen.");
    importWords = Array(12).fill("");
    is24Words = false;
    step = "import";
  }

  function handleCopy() {
    navigator.clipboard.writeText(mnemonic);
    isCopied = true;
    logAction("Mnemonic copied to clipboard.");
    setTimeout(() => {
      isCopied = false;
    }, 2000);
  }

  function toggleWordCount() {
    is24Words = !is24Words;
    if (is24Words) {
      importWords = [...importWords, ...Array(12).fill("")].slice(0, 24);
      logAction("Switched import grid to 24 words.");
    } else {
      importWords = importWords.slice(0, 12);
      logAction("Switched import grid to 12 words.");
    }
  }

  function handlePaste(e: ClipboardEvent, index: number) {
    e.preventDefault();
    const text = e.clipboardData?.getData("text") || "";
    const pastedWords = text.trim().split(/\s+/);
    
    if (pastedWords.length > 1) {
      let newWords = [...importWords];
      for (let k = 0; k < pastedWords.length; k++) {
        if (index + k < newWords.length) {
          newWords[index + k] = pastedWords[k].toLowerCase();
        }
      }
      importWords = newWords;
      logAction(`Pasted multiple words starting at slot ${index + 1}`);
    } else {
      let newWords = [...importWords];
      newWords[index] = text.trim().toLowerCase();
      importWords = newWords;
    }
  }

  function proceedToPassword() {
    error = "";
    if (step === "import") {
      const cleaned = importWords.map(w => w.trim().toLowerCase()).join(" ");
      const wordCountActual = cleaned.split(" ").length;
      if (wordCountActual !== 12 && wordCountActual !== 24) {
        error = "Please fill in all the recovery words.";
        return;
      }
      mnemonic = cleaned;
      logAction("Valid seed phrase provided for import.");
    }
    step = "password";
  }

  async function handleFinishSetup() {
    const cleanUser = username.trim().replace(/^@/, "");
    if (!cleanUser) {
      error = "Please choose a username.";
      return;
    }
    if (cleanUser.length < 2) {
      error = "Username must be at least 2 characters long.";
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUser)) {
      error = "Username can only contain letters, numbers, hyphens, and underscores.";
      return;
    }
    if (password.length < 8) {
      error = "Password must be at least 8 characters long.";
      return;
    }
    if (password !== confirmPassword) {
      error = "Passwords do not match.";
      return;
    }

    try {
      error = "";
      logAction("Encrypting wallet mnemonic with derived key...");
      await setupWallet(mnemonic, password, cleanUser);
      logAction(`Wallet initialized for user @${cleanUser} and saved to localStorage.`);
      onComplete(password);
    } catch (e: any) {
      error = e.message || "Failed to set up wallet.";
      logAction(`Error setting up wallet: ${error}`);
    }
  }

  function goBack() {
    error = "";
    if (step === "generate" || step === "import") {
      step = "intro";
      isRevealed = false;
      hasSavedPhrase = false;
    } else if (step === "password") {
      step = mnemonic === importWords.map(w => w.trim()).join(" ") ? "import" : "generate";
    }
  }
</script>

<div class="welcome-container animate-fade-in">
  {#if step === "intro"}
    <!-- Brand Header -->
    <div class="logo-area">
      <div class="brand-logo">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="welcomeRindGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#d5f7a3" />
              <stop offset="40%" stop-color="#a4db44" />
              <stop offset="85%" stop-color="#699c15" />
              <stop offset="100%" stop-color="#41630b" />
            </radialGradient>
            <radialGradient id="welcomePulpGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#1b1e22" />
              <stop offset="85%" stop-color="#121418" />
              <stop offset="100%" stop-color="#1c2b12" />
            </radialGradient>
          </defs>
          <path d="M 15,35 C 10,65 30,85 50,85 C 70,85 90,65 85,35 C 80,48 20,48 15,35 Z" fill="url(#welcomeRindGrad)" />
          <g transform="translate(50, 40) rotate(-22) scale(1, 0.52) translate(-50, -50)">
            <circle cx="50" cy="50" r="37" fill="url(#welcomePulpGrad)" stroke="#c7f284" stroke-width="4.5"/>
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
      <p class="subtitle">The web-native multichain portal</p>
    </div>

    <div class="step-content">
      <p class="intro-desc">
        A secure web-based multichain wallet. Manage your Solana and Ethereum assets, explore custom apps, and experience seamless integrations.
      </p>

      <div class="actions">
        <button class="primary" onclick={handleCreateNew}>
          Create a new wallet
        </button>
        <button class="secondary" onclick={handleImport}>
          Import recovery phrase
        </button>
      </div>
    </div>
  {:else}
    <!-- Custom centered step progress header with 4 dots and Help details -->
    <div class="step-progress-header">
      <button class="back-arrow-btn" onclick={goBack} title="Go Back">←</button>
      <div class="progress-dots">
        <span class="dot active"></span>
        <span class="dot active"></span>
        <span class="dot {step === 'password' ? 'active' : ''}"></span>
        <span class="dot"></span>
      </div>
      <div class="info-help-container">
        <span class="info-help-btn">ⓘ</span>
        <div class="info-tooltip-bubble">
          Keep your mnemonic secret. Anyone with access to these words controls your funds.
        </div>
      </div>
    </div>

    {#if step === "generate"}
      <div class="step-content">
        <h2 class="recovery-title-center">Recovery Phrase</h2>
        <p class="recovery-warning-text">
          This phrase is the ONLY way to recover your wallet. Do NOT share it with anyone!
        </p>

        <!-- Blurred Mnemonic Grid and Toggle eye overlay -->
        <div class="mnemonic-blur-wrapper">
          <div class="mnemonic-grid {!isRevealed ? 'blurred' : ''}">
            {#each words as word, i}
              <div class="word-chip">
                <span class="index">{i + 1}</span>
                <span class="word">{word}</span>
              </div>
            {/each}
          </div>

          {#if !isRevealed}
            <div class="reveal-overlay" onclick={() => isRevealed = true}>
              <div class="eye-icon-button">
                <!-- Eye-slash SVG Icon -->
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </div>
            </div>
          {/if}
        </div>

        <button class="copy-link-btn" onclick={handleCopy}>
          {isCopied ? "✓ Copied" : "Copy to Clipboard"}
        </button>

        <!-- Saved phrase checkbox row -->
        <label class="checkbox-container-row">
          <input type="checkbox" bind:checked={hasSavedPhrase} />
          <span>I saved my Recovery Phrase</span>
        </label>

        <button class="primary full-width" onclick={proceedToPassword} disabled={!hasSavedPhrase}>
          Continue
        </button>
      </div>
    {:else if step === "import"}
      <div class="step-content">
        <h2 class="recovery-title-center">Recovery Phrase</h2>
        <p class="recovery-instructions-center">
          Import an existing wallet with your 12 or 24-word recovery phrase.
        </p>

        <!-- Grid of input chips -->
        <div class="import-word-container">
          <div class="import-word-grid {is24Words ? 'grid-24' : ''}">
            {#each importWords as _, i}
              <div class="import-word-input-chip">
                <span class="import-index">{i + 1}.</span>
                <input 
                  type="text" 
                  class="import-field"
                  bind:value={importWords[i]}
                  onpaste={(e) => handlePaste(e, i)}
                  placeholder=""
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                />
              </div>
            {/each}
          </div>
        </div>

        <!-- 12 / 24 words toggle link button -->
        <button class="toggle-words-count-btn" onclick={toggleWordCount}>
          I have a {is24Words ? '12' : '24'}-word recovery phrase
        </button>

        {#if error}
          <div class="error-msg">{error}</div>
        {/if}

        <button class="primary full-width" onclick={proceedToPassword} disabled={!allImportWordsFilled}>
          Import Wallet
        </button>
      </div>
    {:else if step === "password"}
      <div class="step-content">
        <h2 class="recovery-title-center">Set Username & Password</h2>
        <p class="recovery-warning-text">
          Choose a unique username and password to secure your wallet on this device.
        </p>

        <div class="form">
          <div class="form-group">
            <label for="uname">Username / Handle</label>
            <input
              type="text"
              id="uname"
              bind:value={username}
              placeholder="e.g. satoshi or alex_crypto"
              autocomplete="off"
              spellcheck="false"
            />
          </div>

          <div class="form-group">
            <label for="pwd">Password</label>
            <input
              type="password"
              id="pwd"
              bind:value={password}
              placeholder="At least 8 characters"
            />
          </div>

          <div class="form-group">
            <label for="conf-pwd">Confirm Password</label>
            <input
              type="password"
              id="conf-pwd"
              bind:value={confirmPassword}
              placeholder="Confirm password"
            />
          </div>
        </div>

        {#if error}
          <div class="error-msg">{error}</div>
        {/if}

        <button class="primary full-width" onclick={handleFinishSetup} disabled={!username.trim() || !password || !confirmPassword}>
          Create Wallet
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .welcome-container {
    padding: 1.2rem 1.65rem;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }

  .logo-area {
    text-align: center;
    margin-top: 1rem;
    margin-bottom: 1.5rem;
  }

  .brand-logo {
    width: 68px;
    height: 68px;
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

  .intro-desc {
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .step-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    justify-content: flex-start;
  }

  /* Centered Step Progress Header classes */
  .step-progress-header {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem 0;
    margin-bottom: 1.25rem;
  }

  .back-arrow-btn {
    position: absolute;
    left: 0;
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.3rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    transition: color 0.2s;
  }

  .back-arrow-btn:hover {
    color: var(--color-text-primary);
  }

  .info-help-container {
    position: absolute;
    right: 0;
    display: inline-block;
  }

  .info-help-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.15rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    transition: color 0.2s;
    user-select: none;
  }

  .info-help-btn:hover {
    color: var(--color-text-primary);
  }

  .info-tooltip-bubble {
    visibility: hidden;
    opacity: 0;
    position: absolute;
    right: 0;
    top: calc(100% + 5px);
    width: 210px;
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    padding: 0.6rem;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg), 0 10px 25px rgba(0,0,0,0.5);
    z-index: 100;
    transition: opacity 0.2s ease, visibility 0.2s ease;
    pointer-events: none;
    line-height: 1.4;
    text-align: left;
    white-space: normal;
  }

  .info-help-container:hover .info-tooltip-bubble {
    visibility: visible;
    opacity: 1;
  }

  .progress-dots {
    display: flex;
    gap: 0.45rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--color-surface-active);
    transition: background-color 0.2s;
  }

  .dot.active {
    background-color: var(--color-primary); /* Lime green accent */
    box-shadow: 0 0 6px rgba(199, 242, 132, 0.4);
  }

  /* Recovery title and warning subtext classes */
  .recovery-title-center {
    text-align: center;
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--color-text-primary);
    margin-bottom: 0.45rem;
  }

  .recovery-warning-text {
    text-align: center;
    color: var(--color-warning);
    font-size: 0.76rem;
    font-weight: 700;
    line-height: 1.45;
    max-width: 290px;
    margin: 0 auto 1.2rem auto;
  }

  .recovery-instructions-center {
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    line-height: 1.45;
    max-width: 290px;
    margin: 0 auto 1.2rem auto;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .actions button {
    width: 100%;
  }

  /* Mnemonic Blur & Hidden Overlay Classes */
  .mnemonic-blur-wrapper {
    position: relative;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background-color: rgba(9, 9, 11, 0.4);
    overflow: hidden;
    margin-bottom: 0.5rem;
    margin-left: 0.4rem;
    margin-right: 0.4rem;
  }

  .mnemonic-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.45rem;
    padding: 0.8rem;
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
    background-color: rgba(0, 0, 0, 0.2);
    cursor: pointer;
    z-index: 10;
  }

  .eye-icon-button {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(0,0,0,0.6);
    transition: transform 0.2s, background-color 0.2s;
  }

  .eye-icon-button:hover {
    transform: scale(1.08);
    background-color: rgba(0, 0, 0, 0.85);
  }

  .word-chip {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
  }

  .word-chip .index {
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .word-chip .word {
    color: var(--color-text-primary);
    font-weight: 500;
  }

  .copy-link-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    display: block;
    margin: 0.35rem auto 1.25rem auto;
    transition: color 0.2s;
  }

  .copy-link-btn:hover {
    color: var(--color-primary);
  }

  /* Saved phrase Checkbox Row Classes */
  .checkbox-container-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1.4rem;
    cursor: pointer;
    user-select: none;
    padding: 0.15rem;
    margin-left: 0.4rem;
    margin-right: 0.4rem;
  }

  .checkbox-container-row input[type="checkbox"] {
    width: 16px;
    height: 16px;
    border-radius: var(--radius-sm);
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  .checkbox-container-row span {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  /* Import word grid inputs style */
  .import-word-container {
    background-color: rgba(9, 9, 11, 0.4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0.65rem;
    margin-bottom: 0.85rem;
    margin-left: 0.4rem;
    margin-right: 0.4rem;
  }

  .import-word-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.45rem;
    max-height: 240px;
    overflow-y: auto;
  }

  .import-word-grid.grid-24 {
    grid-template-columns: repeat(3, 1fr);
    max-height: 250px;
  }

  .import-word-input-chip {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.35rem 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .import-index {
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    width: 1.25rem;
  }

  .import-field {
    background: none;
    border: none;
    outline: none;
    color: var(--color-text-primary);
    font-size: 0.8rem;
    font-weight: 600;
    width: 100%;
    padding: 0;
  }

  .toggle-words-count-btn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    display: block;
    margin: 0.25rem auto 1.4rem auto;
    transition: color 0.2s;
  }

  .toggle-words-count-btn:hover {
    color: var(--color-text-primary);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-group label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .error-msg {
    color: var(--color-error);
    font-size: 0.8rem;
    background-color: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    padding: 0.6rem 0.8rem;
    border-radius: var(--radius-sm);
    margin-bottom: 1rem;
  }

  .full-width {
    width: 100%;
    margin-top: auto;
  }
</style>
