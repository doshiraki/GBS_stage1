# ⛩️ GBS Stage 1: Functional Specifications

> **"Environment-Aware Gateway."** Stage 1 は、GBSのエントリーポイントとして機能し、実行環境（本番/開発）に応じたコンテキストの注入とカーネルの起動を行います。

---

## ⚙️ 機能仕様 (Functional Specs)

### 1. リクエストの正規化 (Request Normalization)

HTTPリクエスト (`doGet`) と RPCリクエスト (`google.script.run`) という異なる2つの入り口を、単一のブートプロセスに統合します 。

- **仕様:** どちらの経路から呼ばれても、`BIOS.boot()` メソッドには統一された `parameter` オブジェクトが渡されます。
- **メリット:** 後続のアプリケーションカーネル (Stage 2) は、呼び出し元プロトコルを意識する必要がありません。
    

### 2. 環境透過ブート (Transparent Booting)

自身の置かれた環境を自己診断し、適切なカーネルをロードします 。

- **Production Mode (Stage 1):**
    
    - `LibPartitionTable` が存在する場合、ルーターとして振る舞い、URLパラメータ `?app=xxx` に基づいて外部ライブラリからカーネルをマウントします。
        
- **Local Mode (Stage 2 Standalone):**
    
    - `LibPartitionTable` が存在せず、ローカルに `BootClass` がある場合、自身をカーネルとして即時起動します。
        

### 3. コンテキスト注入と `exports` 機構 (Context Injection)

**【重要】** 実行環境（ホスト）固有のリソースを、アプリケーションカーネルに注入する機能です。

GBSでは、アプリケーションロジック (`Logic.js` 等) はライブラリとして動作したり、スタンドアロンで動作したりします。この際、単に `PropertiesService` を呼ぶだけでは、意図したスコープ（ホスト側のプロパティか、ライブラリ側のプロパティか）にアクセスできない場合があります。

Stage 1 は `exports` を通じて、**「現在実行中のホスト（自分自身）」のローカルリソースへの参照** をカーネルに明示的に渡します 。


```js
// BIOS.js Configuration
const GBS_CONFIG = {
  // ...
  exports: {
    // 実行中のスクリプト（Stage 1 または Stage 2）自身のプロパティストアを渡す
    ScriptProperties: PropertiesService.getScriptProperties()
  }
};
```

#### `exports` が解決する課題

この仕組みにより、アプリケーションカーネルは以下の挙動を一貫して実現できます。

- **Case A: Stage 1 (本番) で動作中**
    
    - 注入される値: **Stage 1 の ScriptProperties**
        
    - 意味: 本番環境の設定値（本番DBの接続先など）を読み書きします。
        
- **Case B: Stage 2 (開発) で動作中**
    
    - 注入される値: **Stage 2 の ScriptProperties**
        
    - 意味: 開発環境の設定値（テスト用APIキーなど）を読み書きします。
        

**結果:** アプリケーションコードは「今どこで動いているか」を気にせず、渡された `BIOS_exports.ScriptProperties` を使うだけで、常に**「その環境のローカル値」**を正しく操作できます。

---

## 📦 依存関係 (Dependencies)

### 必須ライブラリ

- **LibPartitionTable (L0 Router)**
    
    - ルーティング情報の解決に使用します。
        
    - 常に `Development Mode: ON` (HEAD) で参照し、最新のルーティング設定を反映させます 。
        
---
## 🚀 運用フロー

1. **デプロイ:**
    
    - このプロジェクトを Web App としてデプロイします。

    - 生成された URL が、全 GBS アプリケーション共通のエントリーポイントとなります。
        
2. **設定:**
    
    - **環境変数の管理:** `exports` 機能により、Stage 1 プロジェクトの「スクリプトのプロパティ」に設定した値は、全アプリケーションから参照可能になります（共通の環境変数として機能します）。