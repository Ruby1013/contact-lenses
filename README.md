# LensPrice：隱形眼鏡價格比較器

第一版比較八個台灣隱形眼鏡零售網站：漾美、鏡后、睛美、BBLens、愛戴 AIDAI、Afternun Lab、MoreFine Optical 與屈臣氏 Watsons。商品以「實際獲得總片數」換算每片成本，將買幾盒、送幾盒與原價分開保存，避免促銷組合造成誤判。

首頁提供九宮格品牌入口：酷柏、博士倫、晶碩、海昌、嬌生安視優、美若康、愛爾康、帝康、星歐。點選任一格會跳到該品牌的專屬比較區；每個可對齊品項會依每片成本列出前三低價。若暫時只收錄一或兩家，頁面會顯示實際收錄家數，不會把未蒐集到的通路當成排名。網址也會保存品牌名稱，重新整理仍可回到同一品牌。品牌別名集中於 `target_brands.json`，便於維護跨網站的不同名稱。

## 開啟比較頁

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
python collector.py "商品頁網址"
```

先檢查擷取結果、不寫入資料：

```bash
python collector.py --dry-run "商品頁網址"
```

資料會寫入 `products.json`。若商店版型或促銷文案改變，請先用 `--dry-run` 檢查 `piecesPerBox`、`giftBoxes` 與 `unitPrice` 是否正確。

## 資料欄位

`source`、`brand`、`product`、`salePrice`、`listPrice`、`piecesPerBox`、`boughtBoxes`、`giftBoxes`、`totalPieces`、`unitPrice`、`url`、`checkedAt`。

同一商品要跨通路排名時，另加上相同的 `comparisonKey` 與人類可讀的 `comparisonName`。只有系列、配戴週期、片數與促銷門檻一致時，才應共用同一個 `comparisonKey`；這可避免把不同規格錯排成前三低價。

> 價格與庫存隨時可能變動；運費、會員優惠、處方資格與結帳限定促銷均不會自動計入。購買前請回原商品頁確認。
