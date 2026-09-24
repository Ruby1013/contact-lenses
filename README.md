# LensPrice：隱形眼鏡價格比較器

## 新增品牌價格表（2026-09-24 匯入）

首頁原有九品牌之外，增加三欄品牌格。`public/brand-rankings.json` 保存九家店價格表中可對齊的 117 款品項、1,332 筆報價，來源日期仍為 2026-09-22 至 2026-09-23。有至少 3 款可比價品項的新增品牌獨立成格，其餘集中到「其他」，可再選品牌。

新增資料沿用該次試算表的口徑：同品牌、系列、配戴週期及盒裝片數比較，單販與量販分開，每店取最低每盒均價，同價並列。每個子榜須至少 2 家；即期、缺貨、跨系列及規格不明品項不列入。花色可能不同，卡片保留原品名及條件。小包裝贈片和未確認贈品不折入盒數。原有九品牌資料與比價方式保留。

使用 `python import_brand_rankings.py <已檢查的 prepared.json 路徑>` 匯入；執行 `node test_brand_rankings.cjs` 驗證新品牌、其他分類、單販量販、名次及日期。

第一版比較八個台灣隱形眼鏡零售網站：漾美、鏡后、睛美、BBLens、愛戴 AIDAI、Afternun Lab、MoreFine Optical 與屈臣氏 Watsons。商品以「實際獲得總片數」換算每片成本，將買幾盒、送幾盒與原價分開保存，避免促銷組合造成誤判。

首頁提供九宮格品牌入口：酷柏、博士倫、晶碩、海昌、嬌生安視優、美若康、愛爾康、帝康、星歐。點選任一格會跳到該品牌的專屬比較區；每個可對齊品項會依每片成本列出前三低價。若暫時只收錄一或兩家，頁面會顯示實際收錄家數，不會把未蒐集到的通路當成排名。網址也會保存品牌名稱，重新整理仍可回到同一品牌。品牌別名集中於 `target_brands.json`，便於維護跨網站的不同名稱。

## 開啟比較頁

九個品牌（酷柏、博士倫、安儷、海昌、嬌生安視優、美若康、愛爾康、帝康、星歐）的鏡片品項皆分為兩種排行榜：單盒比價、量販比價。買 1 盒（含附贈）歸單盒，需買 2 盒以上歸量販；先分購買門檻，再在各榜選每個商家最便宜的方案。品項沿用整體至少三站的收錄門檻，子榜不足三家照實顯示，沒有資料則標示尚未收錄。所有隱形眼鏡的每片價格皆以總價／實得總片數計算，並無條件捨去至個位數後顯示與排名。保養液與舒潤液維持每毫升比價。執行 `node test_cooper.cjs` 驗證。

不需要安裝套件：

```bash
python -m http.server 8000 --directory public
```

瀏覽器開啟 `http://localhost:8000`。

## 部署到 Render

在 Render 建立 **Static Site**，連結 GitHub 的 `Ruby1013/contact-lenses`，分支選 `main`。專案已附上 `render.yaml`；Render 會直接發布已提交的 `public` 目錄，不需要安裝套件。

## 加入或更新商品

商品頁必須是公開網址，且網域需列在 `collector.py` 的 `SOURCES`。此工具只讀取公開頁面，不登入、不加入購物車，也不下單。

```bash
python collector.py "商品頁網址" --comparison-key "已核對的既有 comparisonKey"
```

先檢查擷取結果、不寫入資料：

```bash
python collector.py --dry-run "商品頁網址"
```

資料會寫入 `products.json`。若商店版型或促銷文案改變，請先用 `--dry-run` 檢查 `piecesPerBox`、`giftBoxes` 與 `unitPrice` 是否正確。

新增來源時，必須人工確認商品系列與規格，並指定既有 `--comparison-key`，避免有價格卻未加入跨站排行榜。更新同一商品網址會保留原比價群組；共用分類網址的多筆商品、缺少片數或片數不符時會拒絕寫入，避免誤刪或錯配。`--dry-run` 只預覽擷取結果，不代表通過寫入驗證。來源池的「已列入比價」僅表示收錄該網站的部分商品，不表示已完整收錄所有品項。

## 資料欄位

保養液與舒潤液使用 `productType: "solution"`、`volumeMl`（每瓶／支容量）與 `totalVolumeMl`（整組實得容量）。混合容量組合只填總容量，不冒用每瓶容量。每毫升成本為 `salePrice / totalVolumeMl`，排序使用未取整的小數，顯示至小數兩位。既有液體商品已補齊容量；前端載入時重新換算，避免沿用缺漏或為 0 的單價。驗證：`node test_solutions.cjs`。

`source`、`brand`、`product`、`salePrice`、`listPrice`、`piecesPerBox`、`boughtBoxes`、`giftBoxes`、`totalPieces`、`unitPrice`、`url`、`checkedAt`。

同一商品要跨通路排名時，另加上相同的 `comparisonKey` 與人類可讀的 `comparisonName`。只有系列、配戴週期、片數與促銷門檻一致時，才應共用同一個 `comparisonKey`；這可避免把不同規格錯排成前三低價。

> 價格與庫存隨時可能變動；運費、會員優惠、處方資格與結帳限定促銷均不會自動計入。購買前請回原商品頁確認。
