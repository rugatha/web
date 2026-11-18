# Creature type 對照備註

species.json 的 creature-type 是小寫英文 ID 的陣列，主要使用 D&D 的 14 種正式 creature type 名稱，另加 Rugatha 自訂的 `magical-creature`（魔法生物）、`deepling`（深淵生物）與 `klaussian`（有鉗人）導覽分類。頁面只翻譯顯示名稱。這是種族導覽的分類參考，不會自動決定遊戲規則；多個值可能表示不同版本的分類，或同時保留官方類型與 Rugatha 的導覽分類。

## 官方依據

- [D&D 2024 Basic Rules：Creature Type](https://www.dndbeyond.com/sources/dnd/br-2024/how-to-use-a-monster) 列出 14 類與其定義，是此處的欄位字彙。
- [Sage Advice Compendium](https://www.dndbeyond.com/sources/dnd/sae/sage-advice-compendium) 明言 Aasimar 與 Tiefling 都是 Humanoid，不能因其血統直接改列 Celestial／Fiend。
- [2024 Goblin Warrior](https://www.dndbeyond.com/monsters/5195050-goblin-warrior) 是 Fey；[舊版 Goblin](https://www.dndbeyond.com/monsters/16907-goblin) 用 Humanoid。故 goblin 保留兩者。
- 羽族 Featherkin／`featherkin` 為母種，天狗 Kenku／`kenku` 與鳥人 Birdman／`birdman` 為其亞種；沿用 Humanoid 分類。
- [2024 Merfolk Skirmisher](https://www.dndbeyond.com/monsters/5195119-merfolk-skirmisher) 是 Elemental，[舊版 Merfolk](https://www.dndbeyond.com/monsters/16955-merfolk) 是 Humanoid；merfolk 保留兩者。
- [新版 Centaur Trooper](https://www.dndbeyond.com/monsters?page=28) 為 Fey，[舊版 Centaur](https://www.dndbeyond.com/monsters/16821-centaur) 為 Monstrosity；centaur 保留兩者。
- [Minotaur 官方怪物條目](https://www.dndbeyond.com/monsters/16958-minotaur) 是 Monstrosity；[官方怪物列表](https://www.dndbeyond.com/monsters?filter-type=elemental&page=106) 亦有 Humanoid 的 Minotaur Archaeologist／Infiltrator；minotaur 保留兩者。
- [2024 Werewolf](https://www.dndbeyond.com/sources/dnd/br-2024/creature-stat-blocks) 是 Monstrosity；[舊版怪物列表](https://www.dndbeyond.com/monsters?page=170) 有 Humanoid (shapechanger) 的 Werewolf；werewolf 保留兩者。
- [Gargoyle](https://www.dndbeyond.com/monsters/5195003-gargoyle) 是 Elemental、[Sphinx](https://www.dndbeyond.com/monsters/4775843-sphinx-of-wonder) 是 Celestial、[Banderhobb](https://www.dndbeyond.com/monsters?page=16) 是 Monstrosity、[Naga](https://www.dndbeyond.com/monsters/17019-spirit-naga) 是 Monstrosity、[Quasit](https://www.dndbeyond.com/monsters/4775835-quasit) 是 Fiend。
- [Harengon 官方介紹](https://www.dndbeyond.com/posts/1074-new-d-d-race-get-a-sneak-peek-at-harengons-from) 指出玩家兔人是 Humanoid，縱使源於 Feywild。

## Rugatha 暫定分類

有鉗人（`klaussian`）作為生物類型，不再是母種。蟹人（`crabman`）、龍蝦人（`lobsterfolk`）與蠍人（`scorpionfolk`）均為獨立種族，三者皆標記為 `monstrosity`、`deepling`、`klaussian`，通常居住在深淵時空的克勞辛頓。

以下並無可直接套用的同名 D&D 官方 creature type；資料欄位是參照官方類別的編輯判斷，待世界觀定稿時可修訂：

| ID | 暫定類型 | 判斷 |
|---|---|---|
| foxfolk、ratfolk、fishfolk、frogfolk、naga（合併蛇人） | Humanoid | 章節呈現為具人物身分的獸形或水生人形族群。 |
| laztek | Beast、Magical Creature | 外形為掘地的獸形四足生物；依 Rugatha 設定另列為魔法製造生物。 |
| bach-tahn | Magical Creature | 依 Rugatha 設定列為魔法製造生物，移除原本暫定的 Aberration。 |
| spirit | Undead | 現有角色包含死後幽魂或寄宿靈魂；未確認是否所有「精靈」都屬不死生物。 |
| god | Celestial | 僅作神聖性質的導覽歸類；D&D 沒有把所有神祇固定列成 Celestial。 |
| shapeshifter | Humanoid | 角色資料共用的廣義變形獸標籤，本體種類未明。 |
| bone-golem | Construct、Magical Creature | 依章節中的人工造物身分保留 Construct；網站分類則依使用者指定列在 Skeleton 的亞種下，並無獨立牌卡。 |

`banderhobb`、`mimic`、`gargoyle` 保留各自的 D&D 類型，並加上 Rugatha 的 Magical Creature 分類。

Elf 的亞種沿用 Elf 的 Humanoid 分類。條目所列類型用於閱讀與整理，不能取代角色或單一個體的設定。
