import unittest

from collector import merge_record


class CollectionGroupingTests(unittest.TestCase):
    def setUp(self):
        self.old = dict(url="https://example.com/myday", comparisonKey="myday-30",
                        comparisonName="MyDay 30", piecesPerBox=30, totalPieces=30,
                        salePrice=900)
        self.new = dict(url=self.old["url"], piecesPerBox=30, totalPieces=30, salePrice=800)

    def test_refresh_preserves_group_and_updates_price(self):
        result = merge_record([self.old], self.new)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["comparisonKey"], "myday-30")
        self.assertEqual(result[0]["salePrice"], 800)

    def test_new_source_requires_explicit_group(self):
        self.new["url"] = "https://example.org/myday"
        with self.assertRaises(ValueError):
            merge_record([self.old], self.new)
        result = merge_record([self.old], self.new, "myday-30")
        self.assertEqual(len(result), 2)
        self.assertEqual(result[1]["comparisonKey"], self.old["comparisonKey"])

    def test_shared_category_url_cannot_delete_other_products(self):
        with self.assertRaises(ValueError):
            merge_record([self.old, {**self.old, "comparisonKey": "other"}], self.new)

    def test_missing_or_different_pack_size_is_rejected(self):
        for size in (None, 90):
            with self.subTest(size=size), self.assertRaises(ValueError):
                merge_record([self.old], {**self.new, "piecesPerBox": size})

    def test_unknown_group_is_rejected(self):
        with self.assertRaises(ValueError):
            merge_record([self.old], self.new, "typo")

    def test_single_and_bulk_same_url_survive_refresh(self):
        bulk = {**self.old, "boughtBoxes": 4, "totalPieces": 120, "salePrice": 1120}
        single = {**self.new, "boughtBoxes": 1, "salePrice": 310}
        result = merge_record([bulk], single, "myday-30")
        self.assertEqual(len(result), 2)
        result = merge_record(result, {**single, "salePrice": 300})
        self.assertEqual(sorted(p["salePrice"] for p in result), [300, 1120])


if __name__ == "__main__":
    unittest.main()
