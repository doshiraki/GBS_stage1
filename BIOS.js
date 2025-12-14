// ==========================================
// ⚙️ BIOS Configuration
// ==========================================
const GBS_CONFIG = {
  defaultPartition: 'PRD',        // Stage1のみで使用する
  devAppTitle: 'Dual World Clock TEST' // Stage2のみで使用する
};

// ==========================================
// 🌍 Power On (HTTP Entry)
// ==========================================
function doGet(e) {
  return new BIOS(GBS_CONFIG).boot(e);
}

// ==========================================
// ⚡ RPC Interrupt
// ==========================================
// Proxyから送られてくる run(funcName, argsArray) を受け取るよ
function run(mode, args) { // ← 第2引数を 'params' から 'args' に変更
  // argsが空の場合の安全策
  const safeArgs = args || [];
  
  return new BIOS(GBS_CONFIG).boot({ 
    // 💡 ポイント: '...params' で展開せず、'args' プロパティとして配列のまま渡す！
    parameter: { mode: mode, args: safeArgs }, 
    type: 'RPC' 
  });
}

// ==========================================
// 🖥️ BIOS Class (Universal Boot Manager)
// ==========================================
class BIOS {
  constructor(config) {
    this.config = config || {};
  }

  boot(e) {
    try {
      const params = (e && e.parameter) ? e.parameter : {};
      let KernelClass = null;
      let bootConfig = {};

      // 🟢 Mode 1: Stage 1 Gateway (本番環境)
      // GasPartitionTable が「存在する場合のみ」実行する安全設計
      if (typeof LibPartitionTable !== 'undefined') {
        const partitionId = params.app || this.config.defaultPartition;
        KernelClass = LibPartitionTable.PartitionTable.mountPartition(partitionId);
        
        if (!KernelClass) throw new Error(`Partition Not Found: ${partitionId}`);
        
        bootConfig = {
          ...bootConfig,
          appTitle: LibPartitionTable.PartitionTable.getAppTitle(partitionId),
          bootPartition: partitionId
        };
      } 
      
      // 🟠 Mode 2: Stage 2 Local Boot (開発環境)
      // PartitionTableがない場合はこちらに落ちてくる
      else if (typeof BootClass !== 'undefined') {
        KernelClass = BootClass;
        bootConfig = {
          ...bootConfig,
          appTitle: this.config.devAppTitle,
          bootPartition: 'Local'
        };
      }

      // 🔴 System Halt
      if (!KernelClass) {
        throw new Error('SYSTEM HALTED: No Boot Device (PartitionTable or BootClass) found.');
      }

      // 🚀 Boot Kernel
      const kernel = new KernelClass(bootConfig);
      console.log(e);
      return kernel.run(e);

    } catch (err) {
      // 万能版のエラーヘッダーは [BIOS Error]
      const msg = `[BIOS Error] ${err.message}`;
      console.error(msg+`\n${err.stack}`);
      throw new Error((e && e.type === 'RPC') ? msg : ContentService.createTextOutput(msg));
    }
  }
}