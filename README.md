# Pixel Relic RPG

Next.js App RouterとServer Actionsで作った、スマホ向けのレトロRPGプロトタイプです。

## Features

- Server Actionsで戦闘、逃走、道具、装備、合成、錬成、探索を処理
- 認証とデータベースなしのダミーデータ構成
- ドット絵風UI、敵、ドロップ、経験値、お金、素材、装備、装飾品、依頼、図鑑
- GitHub Actionsでlintとbuildを実行
- Vercel向けCDワークフローの雛形

## Local

```bash
npm install
npm run dev
```

http://localhost:3000 を開いて確認できます。

## CI/CD

`.github/workflows/ci.yml` はpushとpull requestで `npm run lint` と `npm run build` を実行します。

`.github/workflows/deploy-vercel.yml` はVercel向けのCD雛形です。使う場合はリポジトリ変数 `ENABLE_VERCEL_DEPLOY=true` と、Secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` を設定してください。
