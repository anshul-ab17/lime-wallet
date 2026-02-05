import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  StatusBar,
  Alert
} from 'react-native';

// Helper to generate a simulated 12-word seed phrase
function generateMnemonic() {
  const words = [
    "lime", "citrus", "fresh", "squeeze", "portal", "wallet", 
    "secure", "chain", "solana", "ether", "block", "asset"
  ];
  // Shuffle words slightly to make it look generated
  return words.sort(() => 0.5 - Math.random()).join(" ");
}

export default function App() {
  // Navigation / Screen routing
  const [screen, setScreen] = useState<'welcome' | 'seed' | 'password' | 'dashboard' | 'swap' | 'stake'>('welcome');
  
  // State
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Simulated balances
  const [solBalance, setSolBalance] = useState(89.8113);
  const [jupBalance, setJupBalance] = useState(2000.0);
  const [usdcBalance, setUsdcBalance] = useState(937.25);
  const [wBalance, setWBalance] = useState(420.0);
  
  // Market rates (automatically synced with Jupiter API)
  const [prices, setPrices] = useState({
    SOL: 142.50,
    JUP: 0.95,
    ETH: 3120.00,
    USDC: 1.00
  });

  // Derived balance USD values
  const solValue = solBalance * prices.SOL;
  const jupValue = jupBalance * prices.JUP;
  const usdcValue = usdcBalance * prices.USDC;
  const wValue = wBalance * 0.8547; // Wormhole token price
  const totalUsd = solValue + jupValue + usdcValue + wValue;

  // Swap State
  const [swapFrom, setSwapFrom] = useState<'SOL' | 'JUP'>('SOL');
  const [swapTo, setSwapTo] = useState<'USDC' | 'JUP'>('JUP');
  const [swapAmount, setSwapAmount] = useState('');

  // Stake State
  const [stakeAmount, setStakeAmount] = useState('');

  // Fetch prices from Jupiter API v2
  const fetchPrices = async () => {
    try {
      const res = await fetch("https://api.jup.ag/price/v2?ids=SOL,ETH,JUP,USDC");
      const json = await res.json();
      if (json && json.data) {
        const fetched = { ...prices };
        for (const [key, val] of Object.entries(json.data)) {
          if (val && (val as any).price) {
            fetched[key as 'SOL' | 'ETH' | 'JUP' | 'USDC'] = parseFloat((val as any).price);
          }
        }
        setPrices(fetched);
      }
    } catch (e) {
      console.warn("Failed to fetch Jupiter prices inside mobile app, using fallbacks:", e);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleCreateWallet = () => {
    setMnemonic(generateMnemonic());
    setScreen('seed');
  };

  const handleMnemonicConfirmed = () => {
    setScreen('password');
  };

  const handlePasswordSubmit = () => {
    if (!password) {
      Alert.alert("Error", "Please enter a password");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    setScreen('dashboard');
  };

  const executeSwap = () => {
    const amt = parseFloat(swapAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (swapFrom === 'SOL') {
      if (amt > solBalance) {
        Alert.alert("Error", "Insufficient SOL balance");
        return;
      }
      setSolBalance(prev => prev - amt);
      if (swapTo === 'JUP') {
        const solPrice = prices.SOL;
        const jupPrice = prices.JUP;
        const outAmt = (amt * solPrice) / jupPrice;
        setJupBalance(prev => prev + outAmt);
        Alert.alert("Success", `Swapped ${amt} SOL to ${outAmt.toFixed(2)} JUP`);
      } else {
        const outAmt = amt * prices.SOL;
        setUsdcBalance(prev => prev + outAmt);
        Alert.alert("Success", `Swapped ${amt} SOL to ${outAmt.toFixed(2)} USDC`);
      }
    } else {
      if (amt > jupBalance) {
        Alert.alert("Error", "Insufficient JUP balance");
        return;
      }
      setJupBalance(prev => prev - amt);
      const outAmt = (amt * prices.JUP) / prices.USDC;
      setUsdcBalance(prev => prev + outAmt);
      Alert.alert("Success", `Swapped ${amt} JUP to ${outAmt.toFixed(2)} USDC`);
    }

    setSwapAmount('');
    setScreen('dashboard');
  };

  const executeStaking = () => {
    const amt = parseFloat(stakeAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    if (amt > solBalance) {
      Alert.alert("Error", "Insufficient SOL balance");
      return;
    }
    setSolBalance(prev => prev - amt);
    Alert.alert("Staking Successful", `Staked ${amt} SOL in Validator Node at 6.85% APY!`);
    setStakeAmount('');
    setScreen('dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090a0c" />

      {/* Screen Router */}
      {screen === 'welcome' && (
        <View style={styles.welcomeContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🍋</Text>
          </View>
          <Text style={styles.brandTitle}>LIME WALLET</Text>
          <Text style={styles.brandSubtitle}>A fresh squeeze on Web3 assets</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateWallet}>
            <Text style={styles.btnPrimaryText}>Create New Wallet</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === 'seed' && (
        <ScrollView contentContainerStyle={styles.centerScroll}>
          <Text style={styles.title}>Back up your seed</Text>
          <Text style={styles.subtitle}>Write down these 12 words somewhere safe. They allow you to recover your funds.</Text>
          
          <View style={styles.seedGrid}>
            {mnemonic.split(" ").map((word, idx) => (
              <View key={idx} style={styles.seedWordCard}>
                <Text style={styles.seedWordIndex}>{idx + 1}</Text>
                <Text style={styles.seedWordText}>{word}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleMnemonicConfirmed}>
            <Text style={styles.btnPrimaryText}>I've written it down</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {screen === 'password' && (
        <View style={styles.formContainer}>
          <Text style={styles.title}>Create a password</Text>
          <Text style={styles.subtitle}>This password will lock and unlock your wallet on this device.</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Enter password" 
            placeholderTextColor="#5e646c"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          
          <TextInput 
            style={styles.input} 
            placeholder="Confirm password" 
            placeholderTextColor="#5e646c"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={handlePasswordSubmit}>
            <Text style={styles.btnPrimaryText}>Set Password</Text>
          </TouchableOpacity>
        </View>
      )}

      {screen === 'dashboard' && (
        <View style={styles.dashboardContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Lime Wallet</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => setScreen('welcome')} style={styles.lockBtn}>
                <Text style={styles.lockBtnText}>Lock</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance Area */}
          <View style={styles.balanceArea}>
            <Text style={styles.usdText}>${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text style={styles.changeText}>+$930.40 (+4.43%)</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert("Receive SOL", "Send funds to your address: \n" + "sol...abc123xyz")}>
              <View style={styles.actionIconCircle}><Text style={styles.actionIconText}>↓</Text></View>
              <Text style={styles.actionLabel}>Receive</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert("Send Tokens", "Open the web app at http://localhost:5173/ to send live RPC transactions.")}>
              <View style={styles.actionIconCircle}><Text style={styles.actionIconText}>↑</Text></View>
              <Text style={styles.actionLabel}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => setScreen('swap')}>
              <View style={styles.actionIconCircle}><Text style={styles.actionIconText}>⇄</Text></View>
              <Text style={styles.actionLabel}>Swap</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => setScreen('stake')}>
              <View style={styles.actionIconCircle}><Text style={styles.actionIconText}>⚙</Text></View>
              <Text style={styles.actionLabel}>Stake</Text>
            </TouchableOpacity>
          </View>

          {/* Assets scroll */}
          <Text style={styles.sectionHeader}>Assets</Text>
          <ScrollView style={styles.assetList}>
            {/* Solana row */}
            <View style={styles.assetRow}>
              <View style={styles.assetLeft}>
                <View style={[styles.assetIcon, { backgroundColor: '#14f195' }]}>
                  <Text style={styles.assetIconLetter}>S</Text>
                </View>
                <View>
                  <Text style={styles.assetName}>Solana</Text>
                  <Text style={styles.assetAmount}>{solBalance.toFixed(4)} SOL</Text>
                </View>
              </View>
              <View style={styles.assetRight}>
                <Text style={styles.assetUsd}>${solValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <Text style={styles.assetRate}>${prices.SOL.toFixed(2)}</Text>
              </View>
            </View>

            {/* Jupiter row */}
            <View style={styles.assetRow}>
              <View style={styles.assetLeft}>
                <View style={[styles.assetIcon, { backgroundColor: '#1c2b12', borderColor: '#c7f284', borderWidth: 1 }]}>
                  <Text style={[styles.assetIconLetter, { color: '#c7f284' }]}>J</Text>
                </View>
                <View>
                  <Text style={styles.assetName}>Jupiter</Text>
                  <Text style={styles.assetAmount}>{jupBalance.toFixed(2)} JUP</Text>
                </View>
              </View>
              <View style={styles.assetRight}>
                <Text style={styles.assetUsd}>${jupValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <Text style={styles.assetRate}>${prices.JUP.toFixed(4)}</Text>
              </View>
            </View>

            {/* USDC row */}
            <View style={styles.assetRow}>
              <View style={styles.assetLeft}>
                <View style={[styles.assetIcon, { backgroundColor: '#2775ca' }]}>
                  <Text style={styles.assetIconLetter}>$</Text>
                </View>
                <View>
                  <Text style={styles.assetName}>USDC</Text>
                  <Text style={styles.assetAmount}>{usdcBalance.toFixed(2)} USDC</Text>
                </View>
              </View>
              <View style={styles.assetRight}>
                <Text style={styles.assetUsd}>${usdcValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <Text style={styles.assetRate}>$1.00</Text>
              </View>
            </View>

            {/* Wormhole row */}
            <View style={styles.assetRow}>
              <View style={styles.assetLeft}>
                <View style={[styles.assetIcon, { backgroundColor: '#333' }]}>
                  <Text style={styles.assetIconLetter}>W</Text>
                </View>
                <View>
                  <Text style={styles.assetName}>Wormhole</Text>
                  <Text style={styles.assetAmount}>{wBalance.toFixed(2)} W</Text>
                </View>
              </View>
              <View style={styles.assetRight}>
                <Text style={styles.assetUsd}>${wValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <Text style={styles.assetRate}>$0.85</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {screen === 'swap' && (
        <View style={styles.formContainer}>
          <Text style={styles.title}>Swap Tokens</Text>
          <Text style={styles.subtitle}>Execute simulated token swaps instantly.</Text>
          
          <View style={styles.swapDropdownRow}>
            <View style={styles.dropdownWrap}>
              <Text style={styles.dropdownLabel}>From</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setSwapFrom(swapFrom === 'SOL' ? 'JUP' : 'SOL')}>
                <Text style={styles.selectBtnText}>{swapFrom}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.dropdownWrap}>
              <Text style={styles.dropdownLabel}>To</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setSwapTo(swapTo === 'JUP' ? 'USDC' : 'JUP')}>
                <Text style={styles.selectBtnText}>{swapTo}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput 
            style={styles.input} 
            placeholder="Amount to swap" 
            placeholderTextColor="#5e646c"
            keyboardType="numeric"
            value={swapAmount}
            onChangeText={setSwapAmount}
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1, marginRight: 8 }]} onPress={executeSwap}>
              <Text style={styles.btnPrimaryText}>Swap Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setScreen('dashboard')}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {screen === 'stake' && (
        <View style={styles.formContainer}>
          <Text style={styles.title}>Lime Staking</Text>
          <Text style={styles.subtitle}>Stake SOL into Lime Staking nodes to earn validator rewards.</Text>
          
          <View style={styles.stakeInfoBox}>
            <Text style={styles.stakeInfoLabel}>Current Rate</Text>
            <Text style={styles.stakeInfoValue}>6.85% APY</Text>
          </View>

          <TextInput 
            style={styles.input} 
            placeholder="Amount of SOL to stake" 
            placeholderTextColor="#5e646c"
            keyboardType="numeric"
            value={stakeAmount}
            onChangeText={setStakeAmount}
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1, marginRight: 8 }]} onPress={executeStaking}>
              <Text style={styles.btnPrimaryText}>Stake SOL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setScreen('dashboard')}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090a0c',
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(199, 242, 132, 0.05)',
    borderWidth: 2,
    borderColor: '#c7f284',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 42,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f4f4f5',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#9ea2a8',
    marginTop: 8,
    marginBottom: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f4f4f5',
    textAlign: 'center',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ea2a8',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 18,
  },
  btnPrimary: {
    backgroundColor: '#c7f284',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  btnPrimaryText: {
    color: '#090a0c',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  btnSecondaryText: {
    color: '#f4f4f5',
    fontSize: 15,
    fontWeight: '700',
  },
  centerScroll: {
    alignItems: 'center',
    padding: 24,
  },
  seedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 16,
  },
  seedWordCard: {
    width: '48%',
    backgroundColor: '#121418',
    borderColor: '#1e221c',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seedWordIndex: {
    fontSize: 11,
    color: '#5e646c',
    fontWeight: '600',
    marginRight: 8,
  },
  seedWordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4f4f5',
  },
  formContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  input: {
    height: 52,
    backgroundColor: '#121418',
    borderColor: '#1e221c',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#f4f4f5',
    fontSize: 15,
    marginVertical: 8,
  },
  dashboardContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f4f4f5',
  },
  headerRight: {
    flexDirection: 'row',
  },
  lockBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  lockBtnText: {
    color: '#9ea2a8',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceArea: {
    alignItems: 'center',
    marginVertical: 20,
  },
  usdText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#f4f4f5',
    letterSpacing: -0.5,
  },
  changeText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
    backgroundColor: '#121418',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e221c',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 18,
    color: '#f4f4f5',
  },
  actionLabel: {
    fontSize: 11,
    color: '#9ea2a8',
    fontWeight: '500',
    marginTop: 6,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5e646c',
    marginVertical: 12,
    letterSpacing: 0.5,
  },
  assetList: {
    flex: 1,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#121418',
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assetIconLetter: {
    color: '#090a0c',
    fontWeight: '800',
    fontSize: 14,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4f4f5',
  },
  assetAmount: {
    fontSize: 11,
    color: '#9ea2a8',
    marginTop: 2,
  },
  assetRight: {
    alignItems: 'end',
  },
  assetUsd: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f4f4f5',
  },
  assetRate: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 2,
  },
  swapDropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  dropdownWrap: {
    width: '47%',
  },
  dropdownLabel: {
    fontSize: 12,
    color: '#5e646c',
    fontWeight: '600',
    marginBottom: 6,
  },
  selectBtn: {
    height: 48,
    backgroundColor: '#121418',
    borderRadius: 12,
    borderColor: '#1e221c',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnText: {
    color: '#f4f4f5',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  stakeInfoBox: {
    backgroundColor: '#121418',
    borderColor: '#1e221c',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  stakeInfoLabel: {
    fontSize: 11,
    color: '#5e646c',
    fontWeight: '600',
  },
  stakeInfoValue: {
    fontSize: 22,
    color: '#c7f284',
    fontWeight: '800',
    marginTop: 4,
  }
});
