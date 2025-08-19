# 🎰 SpotSpinner - MULTIBALL Automation Platform

> **Automated MULTIBALL token minting and Prize Ticket conversion for ApeChain**

Built by [@AThinkingMind](https://x.com/AThinkingMind) | Tip: `0x2616BA6e0AA6dA3F10858c350D447375a39A9b45`

## 🚀 Quick Start (Windows)

**Super Easy Setup - Just 2 clicks!**

1. **Download** this repository as ZIP and extract it
2. **Double-click** `SETUP.bat` and follow the wizard
3. **Done!** The wizard handles everything automatically

### What the Setup Wizard Does:
- ✅ Checks and installs Node.js automatically
- ✅ Installs all required dependencies  
- ✅ Builds the user interface
- ✅ Securely collects your private key (local only!)
- ✅ Creates configuration file
- ✅ Starts the application

## 🎯 Features

### 🔥 Core Automation
- **Automated MULTIBALL Minting**: Mint up to 500 tokens daily with 1-second delays
- **Prize Ticket Conversion**: Convert 10 MULTIBALL → 1 Prize Ticket NFT automatically
- **Real-time Progress Tracking**: See live minting progress (1/500, 2/500, etc.)
- **Smart Token Database**: Instant token access without blockchain scanning

### 🔄 Daily Auto-Repeat
- **24-Hour Cycling**: Automatically mint 500 + convert all tokens every day
- **Persistent Scheduling**: Survives server restarts and continues scheduling
- **Safety Buffers**: 2-minute buffer after cooldown expires
- **One-Click Enable**: Simple checkbox to enable/disable automation

### 💾 Smart Database System
- **Instant Token Access**: No slow blockchain scanning needed
- **Automatic Mint Tracking**: Every minted token automatically added to database
- **Phantom Token Cleanup**: Detects and removes invalid/spent tokens
- **Conversion Optimization**: Automatically groups tokens for efficient conversion

### 🛡️ Security & Safety
- **Local Only**: Everything runs on your computer - no external servers
- **Private Key Safety**: Your key never leaves your machine
- **Transaction Confirmation**: All operations wait for blockchain confirmation
- **Error Handling**: Robust error handling with detailed logging

## 🎮 How to Use

### First Time Setup:
1. Download and extract the ZIP file
2. Double-click `SETUP.bat`
3. Follow the automatic wizard

### Daily Usage:
1. Double-click `START.bat` to launch SpotSpinner
2. Open http://localhost:3001 in your browser
3. Use the Dashboard to:
   - Mint individual tokens
   - Run full automation (mint 500 + convert)
   - Enable daily auto-repeat
   - Monitor your token inventory

## 🔧 Technical Details

### Network Configuration
- **Blockchain**: ApeChain (Chain ID: 33139)
- **RPC**: https://rpc.apechain.com
- **MULTIBALL Contract**: `0x075893707e168162234b62a5b39650e124ff3321`
- **Prize Ticket Contract**: `0x618be6e12dc29e9731e81818c9b9d6bec961b28e`
- **SecretSanta Contract**: `0x80a5e6d411002891e519f531785e7686b3c467ed`

### Automation Settings
- **Daily Limit**: 500 MULTIBALL tokens per day
- **Minting Strategy**: 1 token per transaction + 1-second delay
- **Conversion Rate**: 10 MULTIBALL tokens → 1 Prize Ticket NFT
- **Gas Configuration**: Optimized for ApeChain network

## 🛡️ Security & Privacy

### Your Private Key
- **Stored Locally**: Only in your computer's `.env` file
- **Never Transmitted**: No network calls with your private key
- **Local Processing**: All transactions processed on your machine
- **Open Source**: You can verify all code before use

### Security Best Practices
- ✅ Use a dedicated wallet with limited funds
- ✅ Keep your `.env` file secure and never share it
- ✅ Regular backups of your configuration
- ✅ Monitor your wallet activity regularly

### What We DON'T Do
- ❌ We don't store your private key on any server
- ❌ We don't send your data to external services
- ❌ We don't have access to your wallet or funds
- ❌ We don't log or track your personal information

## 📁 File Structure

```
SpotSpinner/
├── SETUP.bat          # 🚀 One-click setup wizard
├── START.bat           # ▶️  Easy application launcher  
├── setup-wizard.js     # 🔧 Secure configuration setup
├── .env               # 🔐 Your private configuration (created by setup)
├── src/               # 💻 Main application code
├── ui/                # 🎨 Web user interface
└── README.md          # 📖 This file
```

## 🏗️ Manual Setup (Advanced Users)

If you prefer manual setup or are on Mac/Linux:

```bash
# 1. Install dependencies
npm install
cd ui && npm install && cd ..

# 2. Build UI
cd ui && npm run build && cd ..

# 3. Create .env file with your configuration
# (See .env.example for template)

# 4. Start the application
npm run dev
```

## 🎯 Web Interface

Once running, visit http://localhost:3001 to access:

- **Dashboard**: Main control panel with real-time statistics
- **Tokens**: View your MULTIBALL token inventory
- **Logs**: Monitor system activity and transaction status  
- **Settings**: View system configuration and developer info

## 🤝 Support & Development

### Developer
- **Built by**: [@AThinkingMind](https://x.com/AThinkingMind)
- **Twitter/X**: https://x.com/AThinkingMind
- **Tip Address**: `0x2616BA6e0AA6dA3F10858c350D447375a39A9b45`

### Support Development
If SpotSpinner helps you farm MULTIBALL tokens successfully, consider sending a tip in APE to support continued development and improvements!

**APE Address**: `0x2616BA6e0AA6dA3F10858c350D447375a39A9b45`

### Useful Links
- **Wheel of Fate (Official)**: https://wheeloffate.apechain.com/
- **MULTIBALL Contract**: https://apescan.io/address/0x075893707e168162234b62a5b39650e124ff3321
- **Prize Ticket Contract**: https://apescan.io/address/0x618be6e12dc29e9731e81818c9b9d6bec961b28e
- **SecretSanta Contract**: https://apescan.io/address/0x80a5e6d411002891e519f531785e7686b3c467ed

## ⚠️ Disclaimers

- **Use at Your Own Risk**: This is experimental software
- **No Guarantees**: Success depends on network conditions and contract availability
- **Private Key Security**: Keep your private key secure and never share it
- **Monitor Usage**: Regularly check your wallet and transaction activity
- **Test First**: Consider testing with a small amount first

## 📜 License

This project is open source. Feel free to review, modify, and contribute!

---

**Happy MULTIBALL farming! 🎰✨**

*Built with ❤️ for the ApeChain community*