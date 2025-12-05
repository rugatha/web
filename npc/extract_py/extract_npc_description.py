import json
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ====== 1. 把你貼的 JSON 陣列貼到這裡 ======
characters = [
  {
    "name": "Ada",
    "image": "individual_pics/Ada.jpeg",
    "url": "https://rugatha.com/2023/07/16/ada/",
    "race": "Human"
  },
  {
    "name": "Addie Applewood",
    "image": "individual_pics/Addie Applewood.png",
    "url": "https://rugatha.com/2025/01/12/addie-applewood/",
    "race": "Gnome"
  },
  {
    "name": "Adrian Paulson",
    "image": "individual_pics/Adrian Paulson.jpeg",
    "url": "https://rugatha.com/2021/06/20/adrian-paulson/",
    "race": "Human"
  },
  {
    "name": "Alex",
    "image": "individual_pics/Alex.png",
    "url": "https://rugatha.com/2023/09/18/alex/",
    "race": "Human"
  },
  {
    "name": "Alfenor",
    "image": "individual_pics/Alfenor.jpeg",
    "url": "https://rugatha.com/2022/10/23/alfenor/",
    "race": "God"
  },
  {
    "name": "Alfie Fuller",
    "image": "individual_pics/Alfie Fuller.jpeg",
    "url": "https://rugatha.com/2021/05/20/alfie-fuller/",
    "race": "Human"
  },
  {
    "name": "Andrea Day",
    "image": "individual_pics/Andrea Day.jpeg",
    "url": "https://rugatha.com/2023/08/20/andrea-day/",
    "race": "Human"
  },
  {
    "name": "Andronikos Palaiologos",
    "image": "https://rugatha.com/wp-content/uploads/2023/10/andronikos-papailogos.jpeg",
    "url": "https://rugatha.com/2023/08/20/andronikos-palaiologos/",
    "race": "Human"
  },
  {
    "name": "Anna",
    "image": "individual_pics/Anna.png",
    "url": "https://rugatha.com/2022/09/18/anna/",
    "race": "Elf, God"
  },
  {
    "name": "Anya LaVinci",
    "image": "individual_pics/Anya LaVinci.png",
    "url": "https://rugatha.com/2022/04/25/anya-lavinci/",
    "race": "Human"
  },
  {
    "name": "Augustin McFly",
    "image": "individual_pics/Augustin McFly.jpeg",
    "url": "https://rugatha.com/2021/06/20/augustin-mcfly/",
    "race": "Human"
  },
  {
    "name": "Bamu Torrence",
    "image": "individual_pics/Bamu Torrence.png",
    "url": "https://rugatha.com/2021/05/30/bamu-torrence/",
    "race": "Human"
  },
  {
    "name": "Bartosz Richmond",
    "image": "individual_pics/Bartosz Richmond.jpg",
    "url": "https://rugatha.com/2024/03/17/bartosz-richmond/",
    "race": "Human"
  },
  {
    "name": "Basuu",
    "image": "individual_pics/Basuu.png",
    "url": "https://rugatha.com/2022/03/06/basuu/",
    "race": "Elf"
  },
  {
    "name": "Beau",
    "image": "individual_pics/Beau.jpeg",
    "url": "https://rugatha.com/2022/07/11/beau/",
    "race": "Human"
  },
  {
    "name": "Beatrice Eden",
    "image": "individual_pics/Beatrice Eden.png",
    "url": "https://rugatha.com/2022/03/06/beatrice/",
    "race": "Human"
  },
  {
    "name": "King Benevol II",
    "image": "individual_pics/King Benevol II.jpeg",
    "url": "https://rugatha.com/2021/12/27/king-benevol-ii/",
    "race": "Human"
  },
  {
    "name": "Benny Cozlothramuda",
    "image": "individual_pics/Benny Cozlothramuda.jpeg",
    "url": "https://rugatha.com/2021/07/11/benny-cozlothramuda/",
    "race": "Dwarf"
  },
  {
    "name": "Bernard Norm",
    "image": "individual_pics/Bernard Norm.jpeg",
    "url": "https://rugatha.com/2022/11/13/bernard-norm/",
    "race": "Human"
  },
  {
    "name": "BoBo-C/BoBo-Z",
    "image": "individual_pics/BoBo-C:BoBo-Z.jpeg",
    "url": "https://rugatha.com/2023/01/30/bobo-c-bobo-z/",
    "race": "Construct"
  },
  {
    "name": "BoBo-V/BoBo-W",
    "image": "individual_pics/BoBo-V:BoBo-W.jpeg",
    "url": "https://rugatha.com/2023/01/30/bobo-v-bobo-w/",
    "race": "Construct"
  },
  {
    "name": "Bol-Bol/BoBo-OMEGA",
    "image": "individual_pics/Bol-Bol:BoBo-OMEGA.jpeg",
    "url": "https://rugatha.com/2023/01/30/bol-bol-bobo-omega/",
    "race": "Dwarf, Construct"
  },
  {
    "name": "Brock",
    "image": "individual_pics/Brock.jpeg",
    "url": "https://rugatha.com/2022/03/06/brock/",
    "race": "Half Orc"
  },
  {
    "name": "Bruce Dunham",
    "image": "individual_pics/Bruce Dunham.jpeg",
    "url": "https://rugatha.com/2021/05/23/bruce-dunham/",
    "race": "Human"
  },
  {
    "name": "Bruce Tallis",
    "image": "individual_pics/Bruce Tallis.jpg",
    "url": "https://rugatha.com/2025/01/08/bruce-tallis/",
    "race": "Human"
  },
  {
    "name": "Cash Applewood",
    "image": "individual_pics/Cash Applewood.png",
    "url": "https://rugatha.com/2025/01/12/cash-applewood/",
    "race": "Gnome"
  },
  {
    "name": "Cena",
    "image": "individual_pics/Cena.jpeg",
    "url": "https://rugatha.com/2021/12/27/cena/",
    "race": "Human"
  },
  {
    "name": "Dr. Chandra Pyresong",
    "image": "individual_pics/Dr. Chandra Pyresong.jpeg",
    "url": "https://rugatha.com/2023/08/20/chandra-pyresong/",
    "race": "Human"
  },
  {
    "name": "Chi-Chi",
    "image": "individual_pics/Chi-Chi.jpg",
    "url": "https://rugatha.com/2024/09/03/chi-chi/",
    "race": "Human"
  },
  {
    "name": "Child Prodigy",
    "image": "individual_pics/Child Prodigy.jpg",
    "url": "https://rugatha.com/2025/01/08/child-prodigy/",
    "race": "Human"
  },
  {
    "name": "Clark",
    "image": "individual_pics/Clark.jpeg",
    "url": "https://rugatha.com/2022/03/20/clark/",
    "race": "Human"
  },
  {
    "name": "Clementine Allison",
    "image": "individual_pics/Clementine Allison.jpeg",
    "url": "https://rugatha.com/2021/05/23/clementine-allison/",
    "race": "Human"
  },
  {
    "name": "Connie Cornell",
    "image": "individual_pics/Connie Cornell.png",
    "url": "https://rugatha.com/2025/02/24/connie-cornell/",
    "race": "Gnome"
  },
  {
    "name": "Dr. Crow",
    "image": "individual_pics/Dr. Crow.jpeg",
    "url": "https://rugatha.com/2022/03/06/dr-crow/",
    "race": "Human"
  },
  {
    "name": "Dan",
    "image": "individual_pics/Dan.jpeg",
    "url": "https://rugatha.com/2023/04/16/dan/",
    "race": "Human"
  },
  {
    "name": "Daryl Warren",
    "image": "individual_pics/Daryl Warren.png",
    "url": "https://rugatha.com/2021/05/20/daryl-warren/",
    "race": "Human"
  },
  {
    "name": "Dr. David",
    "image": "individual_pics/Dr. David.jpeg",
    "url": "https://rugatha.com/2022/03/06/dr-david/",
    "race": "Human"
  },
  {
    "name": "Dennis",
    "image": "individual_pics/Dennis.jpeg",
    "url": "https://rugatha.com/2022/11/13/dennis/",
    "race": "Human"
  },
  {
    "name": "Domneil",
    "image": "individual_pics/Domneil.png",
    "url": "https://rugatha.com/2021/08/02/domneil/",
    "race": "God"
  },
  {
    "name": "Don",
    "image": "individual_pics/Don.png",
    "url": "https://rugatha.com/2025/07/13/don/",
    "race": "Human"
  },
  {
    "name": "Dosuu",
    "image": "individual_pics/Dosuu.png",
    "url": "https://rugatha.com/2022/03/06/dosuu/",
    "race": "Elf"
  },
  {
    "name": "Eddie",
    "image": "individual_pics/Eddie.jpeg",
    "url": "https://rugatha.com/2022/11/22/eddie/",
    "race": "Human"
  },
  {
    "name": "Edmond",
    "image": "individual_pics/Edmond.png",
    "url": "https://rugatha.com/2022/05/02/edmond/",
    "race": "Elf"
  },
  {
    "name": "Eevie",
    "image": "individual_pics/Eevie.jpeg",
    "url": "https://rugatha.com/2022/11/13/eevie/",
    "race": "Human"
  },
  {
    "name": "Elby / Dr. White",
    "image": "individual_pics/Elby : Dr. White.jpeg",
    "url": "https://rugatha.com/2022/09/25/dr-white/",
    "race": "Fey"
  },
  {
    "name": "King Elliot IV",
    "image": "individual_pics/King Elliot IV.jpeg",
    "url": "https://rugatha.com/2022/09/18/elliot-iv/",
    "race": "Human"
  },
  {
    "name": "Elly Riversend",
    "image": "individual_pics/Elly Riversend.png",
    "url": "https://rugatha.com/2025/01/12/elly-riversend/",
    "race": "Gnome"
  },
  {
    "name": "Elmond",
    "image": "individual_pics/Elmond.jpeg",
    "url": "https://rugatha.com/2023/04/06/elmond/",
    "race": "Elf"
  },
  {
    "name": "Emerald Gorsen",
    "image": "individual_pics/Emerald Gorsen.jpeg",
    "url": "https://rugatha.com/2021/06/20/emerald-gorsen/",
    "race": "Human"
  },
  {
    "name": "Emma",
    "image": "individual_pics/Emma.png",
    "url": "https://rugatha.com/2021/07/11/emma/",
    "race": "Human"
  },
  {
    "name": "Enelmor Arylith",
    "image": "individual_pics/Enelmor Arylith.png",
    "url": "https://rugatha.com/2025/06/29/enelmor-arylith/",
    "race": "Dragonborn"
  },
  {
    "name": "Essis",
    "image": "individual_pics/Essis.png",
    "url": "https://rugatha.com/2024/04/18/essis/",
    "race": "Human"
  },
  {
    "name": "Eva",
    "image": "individual_pics/Eva.jpg",
    "url": "https://rugatha.com/2024/09/08/eva/",
    "race": "Human"
  },
  {
    "name": "Evil Be-4",
    "image": "individual_pics/Evil Be-4.png",
    "url": "https://rugatha.com/2025/01/12/evil-be-4/",
    "race": "Gnome"
  },
  {
    "name": "Fallon",
    "image": "individual_pics/Fallon.jpeg",
    "url": "https://rugatha.com/2023/04/06/fallon/",
    "race": "Elf"
  },
  {
    "name": "The Feywild Archmage",
    "image": "individual_pics/The Feywild Archmage.jpeg",
    "url": "https://rugatha.com/2022/10/09/the-feywild-archmage/",
    "race": "Elf"
  },
  {
    "name": "Fiona",
    "image": "individual_pics/Fiona.png",
    "url": "https://rugatha.com/2021/07/11/fiona/",
    "race": "Human"
  },
  {
    "name": "Mr. Flaerry",
    "image": "individual_pics/Mr. Flaerry.jpeg",
    "url": "https://rugatha.com/2021/09/20/syr-flaerry/",
    "race": "Human"
  },
  {
    "name": "The Fortune Teller",
    "image": "individual_pics/The Fortune Teller.jpeg",
    "url": "https://rugatha.com/2021/12/27/the-fortune-teller/",
    "race": "Human"
  },
  {
    "name": "Frankie",
    "image": "individual_pics/Frankie.jpeg",
    "url": "https://rugatha.com/2022/03/06/frankie/",
    "race": "Human, Demon"
  },
  {
    "name": "Franz",
    "image": "individual_pics/Franz.jpeg",
    "url": "https://rugatha.com/2022/04/18/franz/",
    "race": "Human"
  },
  {
    "name": "Freddy",
    "image": "individual_pics/Freddy.jpeg",
    "url": "https://rugatha.com/2023/05/18/freddy/",
    "race": "Human"
  },
  {
    "name": "Frederick Norman",
    "image": "individual_pics/Frederick Norman.jpeg",
    "url": "https://rugatha.com/2022/03/06/frederick-norman/",
    "race": "Human"
  },
  {
    "name": "Garlia",
    "image": "individual_pics/Garlia.png",
    "url": "https://rugatha.com/2022/11/22/garlia/",
    "race": "Human"
  },
  {
    "name": "Gary",
    "image": "individual_pics/Gary.png",
    "url": "https://rugatha.com/2021/06/13/gary/",
    "race": "Wolf"
  },
  {
    "name": "Gary Berners",
    "image": "individual_pics/Gary Berners.jpeg",
    "url": "https://rugatha.com/2022/03/07/gary-berners/",
    "race": "Human"
  },
  {
    "name": "Glen",
    "image": "individual_pics/Glen.jpeg",
    "url": "https://rugatha.com/2022/03/13/glen/",
    "race": "Human"
  },
  {
    "name": "Graham Dawkin",
    "image": "individual_pics/Graham Dawkin.jpeg",
    "url": "https://rugatha.com/2021/05/30/graham-dawkin/",
    "race": "Human"
  },
  {
    "name": "Gregory the Axe",
    "image": "individual_pics/Gregory the Axe.jpeg",
    "url": "https://rugatha.com/2022/04/10/gregory-the-axe/",
    "race": "Half Orc"
  },
  {
    "name": "Grenland Folsen",
    "image": "individual_pics/Grenland Folsen.jpeg",
    "url": "https://rugatha.com/2021/05/23/grenland-folsen/",
    "race": "Tiefling"
  },
  {
    "name": "Gustavo Norman",
    "image": "individual_pics/Gustavo Norman.png",
    "url": "https://rugatha.com/2022/03/06/gustavo-norman/",
    "race": "Human"
  },
  {
    "name": "Guu-Guu",
    "image": "individual_pics/Guu-Guu.jpeg",
    "url": "https://rugatha.com/2021/08/01/guu-guu/",
    "race": "Orc"
  },
  {
    "name": "Dr. Halloway",
    "image": "individual_pics/Dr. Halloway.jpeg",
    "url": "https://rugatha.com/2021/09/20/dr-halloway/",
    "race": "Human"
  },
  {
    "name": "Harrel Mizel",
    "image": "individual_pics/Harrel Mizel.png",
    "url": "https://rugatha.com/2025/06/29/harrel-mizel/",
    "race": "Dragonborn, Dragon"
  },
  {
    "name": "Hayes",
    "image": "individual_pics/Hayes.jpeg",
    "url": "https://rugatha.com/2022/08/05/hayes/",
    "race": "Human"
  },
  {
    "name": "Hobb",
    "image": "individual_pics/Hobb.png",
    "url": "https://rugatha.com/2022/08/22/hobb/",
    "race": "Banderhobb"
  },
  {
    "name": "The Hooded Figure",
    "image": "individual_pics/The Hooded-Figure.jpeg",
    "url": "https://rugatha.com/2021/05/23/the-hooded-figure/",
    "race": "Shapeshifter"
  },
  {
    "name": "Ilyra Valecrest",
    "image": "individual_pics/Ilyra Valecrest.png",
    "url": "https://rugatha.com/2025/11/17/ilyra-valecrest/",
    "race": "Dragonborn"
  },
  {
    "name": "Indigo",
    "image": "individual_pics/Indigo.jpeg",
    "url": "https://rugatha.com/2022/10/09/indigo/",
    "race": "Elf"
  },
  {
    "name": "Iochi Mari",
    "image": "individual_pics/Iochi Mari.png",
    "url": "https://rugatha.com/2024/04/18/iochi-mari/",
    "race": "Foxfolk"
  },
  {
    "name": "Lord Ishton",
    "image": "individual_pics/Lord Ishton.jpeg",
    "url": "https://rugatha.com/2022/12/05/lord-ishton/",
    "race": "Human"
  },
  {
    "name": "Jacob",
    "image": "individual_pics/Jacob.jpeg",
    "url": "https://rugatha.com/2022/03/06/jacob/",
    "race": "Human"
  },
  {
    "name": "Jasmine Warren",
    "image": "individual_pics/Jasmine Warren.jpeg",
    "url": "https://rugatha.com/2021/05/20/jasmine-warren/",
    "race": "Human"
  },
  {
    "name": "Jeff",
    "image": "individual_pics/Jeff.jpeg",
    "url": "https://rugatha.com/2021/09/20/jeff/",
    "race": "Human"
  },
  {
    "name": "Jefferey Berners",
    "image": "individual_pics/Jefferey Berners.jpeg",
    "url": "https://rugatha.com/2022/03/06/jefferey-berners/",
    "race": "Human"
  },
  {
    "name": "Jonathan",
    "image": "individual_pics/Jonathan.jpeg",
    "url": "https://rugatha.com/2022/03/06/jonathan/",
    "race": "Human"
  },
  {
    "name": "Joseph from Moorland Haunt",
    "image": "https://rugatha.com/wp-content/uploads/2025/04/joseph.png",
    "url": "https://rugatha.com/2022/03/06/joseph/",
    "race": "Human"
  },
  {
    "name": "Joseph from St. Rayami Island",
    "image": "https://rugatha.com/wp-content/uploads/2024/05/joseph.jpg",
    "url": "https://rugatha.com/2024/04/18/joseph-2/",
    "race": "Human"
  },
  {
    "name": "Kai",
    "image": "individual_pics/Kai.jpeg",
    "url": "https://rugatha.com/2021/05/23/kai/",
    "race": "Human"
  },
  {
    "name": "Father Karu",
    "image": "individual_pics/Father Karu.jpeg",
    "url": "https://rugatha.com/2021/06/20/father-karu/",
    "race": "Human"
  },
  {
    "name": "Father Kaulton",
    "image": "individual_pics/Father Kaulton.jpeg",
    "url": "https://rugatha.com/2021/05/23/father-kaulton/",
    "race": "Human"
  },
  {
    "name": "Kahn",
    "image": "individual_pics/Kahn.png",
    "url": "https://rugatha.com/2021/12/27/kahn/",
    "race": "Human"
  },
  {
    "name": "Kess",
    "image": "individual_pics/Kess.png",
    "url": "https://rugatha.com/2022/03/20/kess/",
    "race": "Human"
  },
  {
    "name": "Kevin Bolden",
    "image": "individual_pics/Kevin Bolden.jpeg",
    "url": "https://rugatha.com/2022/03/06/kevin-bolden/",
    "race": "Human"
  },
  {
    "name": "King Knicol",
    "image": "individual_pics/King Knicol.jpeg",
    "url": "https://rugatha.com/2021/08/15/knicol/",
    "race": "Goblin"
  },
  {
    "name": "Kojo",
    "image": "individual_pics/Kojo.png",
    "url": "https://rugatha.com/2022/03/06/kojo/",
    "race": "Human"
  },
  {
    "name": "Lance Berners",
    "image": "individual_pics/Lance Berners.jpeg",
    "url": "https://rugatha.com/2022/03/06/lance-berners/",
    "race": "Human"
  },
  {
    "name": "Laura Fishburne",
    "image": "individual_pics/Laura Fishburne.jpg",
    "url": "https://rugatha.com/2025/01/08/laura-fishburne/",
    "race": "Human"
  },
  {
    "name": "LaVinci",
    "image": "individual_pics/LaVinci.jpeg",
    "url": "https://rugatha.com/2022/04/18/lavinci/",
    "race": "Human"
  },
  {
    "name": "Leonard “Old Pipe\" Riversend",
    "image": "individual_pics/Leonard \"Old Pipe\" Riversend.png",
    "url": "https://rugatha.com/2025/01/12/leonard-old-pipe-riversend/",
    "race": "Gnome"
  },
  {
    "name": "Leslie Grunfeld",
    "image": "individual_pics/Leslie Grunfeld.jpeg",
    "url": "https://rugatha.com/2023/08/20/leslie-grunfeld/",
    "race": "Human"
  },
  {
    "name": "Lewis",
    "image": "individual_pics/Lewis.jpeg",
    "url": "https://rugatha.com/2022/03/27/lewis/",
    "race": "Human"
  },
  {
    "name": "Lil’Lily",
    "image": "individual_pics/Lil'Lily.png",
    "url": "https://rugatha.com/2024/05/27/lillily/",
    "race": "Half Orc"
  },
  {
    "name": "Liliana",
    "image": "individual_pics/Liliana.png",
    "url": "https://rugatha.com/2024/04/18/liliana/",
    "race": "Human"
  },
  {
    "name": "Logan",
    "image": "individual_pics/Logan.png",
    "url": "https://rugatha.com/2022/08/28/logan/",
    "race": "Human"
  },
  {
    "name": "Lorin Reese",
    "image": "individual_pics/Lorin Reese.jpeg",
    "url": "https://rugatha.com/2021/05/19/lorin-reese/",
    "race": "Elf"
  },
  {
    "name": "Lumio",
    "image": "individual_pics/Lumio.png",
    "url": "https://rugatha.com/2025/10/12/lumio/",
    "race": "Construct"
  },
  {
    "name": "Luny",
    "image": "individual_pics/Luny.jpeg",
    "url": "https://rugatha.com/2022/03/06/luny/",
    "race": "Elf"
  },
  {
    "name": "Lysien Amoret",
    "image": "individual_pics/Lysien Amoret.webp",
    "url": "https://rugatha.com/2025/02/24/lysien-amoret/",
    "race": "God"
  },
  {
    "name": "Mafa",
    "image": "individual_pics/Mafa.jpeg",
    "url": "https://rugatha.com/2022/03/06/mafa/",
    "race": "Elf"
  },
  {
    "name": "Magga",
    "image": "individual_pics/Magga.jpg",
    "url": "https://rugatha.com/2024/03/01/magga/",
    "race": "Elf"
  },
  {
    "name": "Syr Magnus",
    "image": "individual_pics/Syr Magnus.jpeg",
    "url": "https://rugatha.com/2021/09/26/syr-magnus/",
    "race": "Halfling"
  },
  {
    "name": "Malcolm Hicks",
    "image": "individual_pics/Malcolm Hicks.jpeg",
    "url": "https://rugatha.com/2023/01/15/malcolm-hicks/",
    "race": "Human"
  },
  {
    "name": "Mango",
    "image": "https://rugatha.com/wp-content/uploads/2024/05/mango-spidey.png",
    "url": "https://rugatha.com/2024/08/06/mango-spidey/",
    "race": "Shapeshifter"
  },
  {
    "name": "Marco",
    "image": "individual_pics/Marco.jpeg",
    "url": "https://rugatha.com/2022/03/06/marco/",
    "race": "Dog"
  },
  {
    "name": "Marcus Jens",
    "image": "individual_pics/Marcus Jens.jpeg",
    "url": "https://rugatha.com/2023/01/15/marcus-jens/",
    "race": "Human"
  },
  {
    "name": "Lady Marian",
    "image": "individual_pics/Lady Marian.jpeg",
    "url": "https://rugatha.com/2022/12/05/lady-marian/",
    "race": "Human"
  },
  {
    "name": "Marianne Jens",
    "image": "https://rugatha.com/wp-content/uploads/2023/11/marianne.jpeg",
    "url": "https://rugatha.com/2023/03/20/marianne-jens/",
    "race": "Human"
  },
  {
    "name": "Maribel Muddlewick",
    "image": "individual_pics/Maribel Muddlewick.png",
    "url": "https://rugatha.com/2025/01/12/maribel_muddlewick/",
    "race": "Gnome"
  },
  {
    "name": "Captain Marin",
    "image": "individual_pics/Captain Marin.jpeg",
    "url": "https://rugatha.com/2022/08/05/captain-marin/",
    "race": "Human"
  },
  {
    "name": "Queen Marva",
    "image": "individual_pics/Queen Marva.jpeg",
    "url": "https://rugatha.com/2023/01/30/queen-marva/",
    "race": "Dwarf"
  },
  {
    "name": "Matilda",
    "image": "individual_pics/Matilda.jpeg",
    "url": "https://rugatha.com/2022/11/22/matilda/",
    "race": "Human"
  },
  {
    "name": "Maylee",
    "image": "individual_pics/Maylee.png",
    "url": "https://rugatha.com/2022/11/07/maylee/",
    "race": "Human"
  },
  {
    "name": "Melvin",
    "image": "individual_pics/Melvin.jpeg",
    "url": "https://rugatha.com/2023/08/20/melvin/",
    "race": "Human"
  },
  {
    "name": "Michael",
    "image": "individual_pics/Michael.jpeg",
    "url": "https://rugatha.com/2022/06/19/michael/",
    "race": "Human"
  },
  {
    "name": "Mikkel Drogskol",
    "image": "individual_pics/Mikkel Drogskol.png",
    "url": "https://rugatha.com/2024/09/08/mikkel-drogskol/",
    "race": "Human, Spirit"
  },
  {
    "name": "Moore",
    "image": "individual_pics/Moore.jpeg",
    "url": "https://rugatha.com/2023/08/20/moore/",
    "race": "Human"
  },
  {
    "name": "The Mother",
    "image": "https://rugatha.com/wp-content/uploads/2023/11/mother.jpeg",
    "url": "https://rugatha.com/2023/01/15/mother/",
    "race": "Spider, God"
  },
  {
    "name": "Mr. Moon",
    "image": "individual_pics/Mr. Moon.jpeg",
    "url": "https://rugatha.com/2022/03/06/mr-moon/",
    "race": "Human"
  },
  {
    "name": "Mr. Muffins",
    "image": "individual_pics/Mr. Muffins.jpeg",
    "url": "https://rugatha.com/2022/11/07/mr-muffins/",
    "race": "Dog"
  },
  {
    "name": "Nathaniel",
    "image": "individual_pics/Nathaniel.jpeg",
    "url": "https://rugatha.com/2022/04/10/nathaniel/",
    "race": "Human"
  },
  {
    "name": "Nelson",
    "image": "individual_pics/Nelson.jpeg",
    "url": "https://rugatha.com/2022/08/05/nelson/",
    "race": "Human"
  },
  {
    "name": "Nick Pan",
    "image": "individual_pics/Nick Pan.jpeg",
    "url": "https://rugatha.com/2022/04/25/nick-pan/",
    "race": "Tiefling"
  },
  {
    "name": "Norvelle",
    "image": "individual_pics/Norvelle.png",
    "url": "https://rugatha.com/2023/04/06/norvelle/",
    "race": "Elf"
  },
  {
    "name": "Nylessa Arylith",
    "image": "individual_pics/Nylessa Arylith.png",
    "url": "https://rugatha.com/2025/06/29/nylessa-arylith/",
    "race": "Dragonborn"
  },
  {
    "name": "Lord Octavian von Oderick",
    "image": "individual_pics/Lord Octavian von Oderick.jpg",
    "url": "https://rugatha.com/2024/05/27/octavian-von-oderick/",
    "race": "Human"
  },
  {
    "name": "Oliver",
    "image": "individual_pics/Oliver.jpeg",
    "url": "https://rugatha.com/2021/10/03/oliver/",
    "race": "Human"
  },
  {
    "name": "Oliver the Wise",
    "image": "individual_pics/Oliver the Wise.jpeg",
    "url": "https://rugatha.com/2022/12/05/oliver-the-wise/",
    "race": "Owl"
  },
  {
    "name": "Ona Berners",
    "image": "individual_pics/Ona Berners.jpeg",
    "url": "https://rugatha.com/2022/03/06/ona-berners/",
    "race": "Human"
  },
  {
    "name": "Oswald Creighton",
    "image": "individual_pics/Oswald Creighton.jpg",
    "url": "https://rugatha.com/2025/01/21/oswald-creighton/",
    "race": "Human"
  },
  {
    "name": "Pamela Yaso",
    "image": "individual_pics/Pamela Yaso.png",
    "url": "https://rugatha.com/2022/11/13/pamela-yaso/",
    "race": "Human"
  },
  {
    "name": "Pattie Sylverome",
    "image": "individual_pics/Pattie Sylverome.jpg",
    "url": "https://rugatha.com/2024/09/03/pattie-sylverome/",
    "race": "Human"
  },
  {
    "name": "Penny Applewood",
    "image": "individual_pics/Penny Applewood.png",
    "url": "https://rugatha.com/2025/01/12/penny-applewood/",
    "race": "Gnome"
  },
  {
    "name": "Pete Madison",
    "image": "individual_pics/Pete Madison.png",
    "url": "https://rugatha.com/2023/08/20/pete-madison/",
    "race": "Human"
  },
  {
    "name": "Peter",
    "image": "individual_pics/Peter.jpeg",
    "url": "https://rugatha.com/2022/11/07/peter/",
    "race": "Human"
  },
  {
    "name": "Phola",
    "image": "individual_pics/Phola.jpeg",
    "url": "https://rugatha.com/2024/03/01/phola/",
    "race": "Elf"
  },
  {
    "name": "Porter Lowe",
    "image": "individual_pics/Porter Lowe.jpeg",
    "url": "https://rugatha.com/2023/01/15/porter-lowe/",
    "race": "Human"
  },
  {
    "name": "Queenie",
    "image": "individual_pics/Queenie.jpeg",
    "url": "https://rugatha.com/2022/11/22/queenie/",
    "race": "Halfling"
  },
  {
    "name": "Quinton Leonard",
    "image": "individual_pics/Quinton Leonard.jpeg",
    "url": "https://rugatha.com/2023/01/15/quinton-leonard/",
    "race": "Human"
  },
  {
    "name": "Ralf",
    "image": "individual_pics/Ralf.png",
    "url": "https://rugatha.com/2024/04/18/ralf/",
    "race": "Half-Elf"
  },
  {
    "name": "Rashim",
    "image": "individual_pics/Rashim.jpeg",
    "url": "https://rugatha.com/2023/01/15/rashim/",
    "race": "Human"
  },
  {
    "name": "Ra'Leer the Herder",
    "image": "individual_pics/Ra'Leer the Herder.jpeg",
    "url": "https://rugatha.com/2021/06/13/raleer-the-herder/",
    "race": "Elf"
  },
  {
    "name": "Reese Tig",
    "image": "https://rugatha.com/wp-content/uploads/2024/05/reese-tig.jpg",
    "url": "https://rugatha.com/2024/04/18/reese-tig/",
    "race": "Human"
  },
  {
    "name": "Riley Richmond",
    "image": "individual_pics/Riley Richmond.jpg",
    "url": "https://rugatha.com/2025/01/08/riley-richmond/",
    "race": "Human"
  },
  {
    "name": "Rina & Rita",
    "image": "individual_pics/Rina & Rita.png",
    "url": "https://rugatha.com/2024/03/01/rina-rita/",
    "race": "Elf"
  },
  {
    "name": "Bishop Robinson",
    "image": "individual_pics/Bishop Robinson.png",
    "url": "https://rugatha.com/2022/08/05/bishop-robinson/",
    "race": "Human"
  },
  {
    "name": "Roger Caleb Johnson",
    "image": "individual_pics/Roger Caleb Johnson.jpeg",
    "url": "https://rugatha.com/2021/06/20/roger-caleb-johnson/",
    "race": "Human"
  },
  {
    "name": "Roline Hughes",
    "image": "individual_pics/Roline Hughes.png",
    "url": "https://rugatha.com/2022/03/20/roline-hughes/",
    "race": "Human"
  },
  {
    "name": "Ronald the Magician",
    "image": "individual_pics/Ronald, the Magician.jpeg",
    "url": "https://rugatha.com/2023/04/05/ronald-the-magician/",
    "race": "Human"
  },
  {
    "name": "Ronfello",
    "image": "individual_pics/Ronfello.png",
    "url": "https://rugatha.com/2024/04/18/ronfello/",
    "race": "Human"
  },
  {
    "name": "Rosa Flaerry",
    "image": "individual_pics/Rosa Flaerry.jpeg",
    "url": "https://rugatha.com/2021/08/29/rosa-flaerry/",
    "race": "Human"
  },
  {
    "name": "Ryon",
    "image": "individual_pics/Ryon.jpeg",
    "url": "https://rugatha.com/2022/08/05/ryon/",
    "race": "Human"
  },
  {
    "name": "Samick Warren",
    "image": "https://rugatha.com/wp-content/uploads/2025/04/sammick-warren.png",
    "url": "https://rugatha.com/2021/05/20/samick-warren/",
    "race": "Human"
  },
  {
    "name": "Sapphire Gorsen",
    "image": "https://rugatha.com/wp-content/uploads/2023/11/sappire-gorsen.jpeg",
    "url": "https://rugatha.com/2021/06/20/sapphire-gorsen/",
    "race": "Human"
  },
  {
    "name": "Sarah",
    "image": "individual_pics/Sarah.jpeg",
    "url": "https://rugatha.com/2022/03/06/sarah/",
    "race": "Human"
  },
  {
    "name": "Scar-Face",
    "image": "individual_pics/Scar-Face.jpeg",
    "url": "https://rugatha.com/2022/03/06/scar-face/",
    "race": "Human"
  },
  {
    "name": "Sean",
    "image": "individual_pics/Sean.jpeg",
    "url": "https://rugatha.com/2022/05/02/sean/",
    "race": "Human"
  },
  {
    "name": "Selene Berners",
    "image": "individual_pics/Selene Berners.png",
    "url": "https://rugatha.com/2022/03/06/selene-berners/",
    "race": "Human"
  },
  {
    "name": "Selyra Arylith",
    "image": "individual_pics/Selyra Arylith.png",
    "url": "https://rugatha.com/2025/06/29/selyra-arylith/",
    "race": "Dragonborn"
  },
  {
    "name": "Serathe Arylith",
    "image": "individual_pics/Serathe Arylith.png",
    "url": "https://rugatha.com/2025/06/29/serathe-arylith/",
    "race": "Dragonborn"
  },
  {
    "name": "Shalan Hartlow",
    "image": "individual_pics/Shalan Hartlow.jpeg",
    "url": "https://rugatha.com/2023/08/21/shalan-hartlow/",
    "race": "Human"
  },
  {
    "name": "Sham",
    "image": "individual_pics/Sham.jpeg",
    "url": "https://rugatha.com/2023/10/10/sham/",
    "race": "Human"
  },
  {
    "name": "Sharman",
    "image": "individual_pics/Sharman.jpeg",
    "url": "https://rugatha.com/2022/09/18/sharman/",
    "race": "Human"
  },
  {
    "name": "Sha'Doom",
    "image": "individual_pics/Sha'Doom.jpeg",
    "url": "https://rugatha.com/2022/03/06/shadoom/",
    "race": "Shapeshifter"
  },
  {
    "name": "Shifu",
    "image": "individual_pics/Shifu.png",
    "url": "https://rugatha.com/2024/03/01/shifu/",
    "race": "Elf"
  },
  {
    "name": "Sigom III",
    "image": "https://rugatha.com/wp-content/uploads/2024/05/sigom.jpg",
    "url": "https://rugatha.com/2024/04/18/sigom-iii/",
    "race": "Kobold"
  },
  {
    "name": "Sora",
    "image": "individual_pics/Sora.jpeg",
    "url": "https://rugatha.com/2023/07/16/sora/",
    "race": "Human"
  },
  {
    "name": "Speedy",
    "image": "individual_pics/Speedy.jpeg",
    "url": "https://rugatha.com/2022/08/15/speedy/",
    "race": "Horse"
  },
  {
    "name": "Stefano",
    "image": "individual_pics/Stefano.jpeg",
    "url": "https://rugatha.com/2022/03/20/stefano/",
    "race": "Human"
  },
  {
    "name": "Tam Quorr",
    "image": "individual_pics/Tam Quorr.png",
    "url": "https://rugatha.com/2025/07/13/tam-quorr/",
    "race": "Human"
  },
  {
    "name": "Theramond Arylith",
    "image": "individual_pics/Theramond Arylith.png",
    "url": "https://rugatha.com/2025/06/29/theramond-arylith/",
    "race": "Dragonborn"
  },
  {
    "name": "Thomas",
    "image": "individual_pics/Thomas.jpeg",
    "url": "https://rugatha.com/2022/11/07/thomas/",
    "race": "Human"
  },
  {
    "name": "Thompson",
    "image": "individual_pics/Thompson.jpg",
    "url": "https://rugatha.com/2024/06/16/thompson/",
    "race": "Human"
  },
  {
    "name": "Mayor Thorne",
    "image": "individual_pics/Mayor Thorne.jpeg",
    "url": "https://rugatha.com/2022/08/22/mayor-thorne/",
    "race": "Human"
  },
  {
    "name": "Tina",
    "image": "individual_pics/Tina.jpg",
    "url": "https://rugatha.com/2024/06/16/tina/",
    "race": "Human"
  },
  {
    "name": "Tommy Caleb Johnson",
    "image": "individual_pics/Tommy Caleb Johnson.jpeg",
    "url": "https://rugatha.com/2021/06/20/tommy-caleb-johnson/",
    "race": "Human"
  },
  {
    "name": "Trisha of Baylon",
    "image": "https://rugatha.com/wp-content/uploads/2023/11/trisha.jpeg",
    "url": "https://rugatha.com/2021/08/08/trisha-of-baylon/",
    "race": "Elf"
  },
  {
    "name": "Twiggle",
    "image": "individual_pics/Twiggle.jpeg",
    "url": "https://rugatha.com/2024/06/16/twiggle/",
    "race": "Squirrel"
  },
  {
    "name": "Queen Uma",
    "image": "individual_pics/Queen Uma.jpeg",
    "url": "https://rugatha.com/2023/01/30/queen-uma/",
    "race": "Dwarf"
  },
  {
    "name": "Vaelric Arylith",
    "image": "individual_pics/Vaelric Arylith.png",
    "url": "https://rugatha.com/2025/06/29/vaelric-arylith/",
    "race": "Dragonborn"
  },
  {
    "name": "Vaerodan Arylith",
    "image": "individual_pics/Vaerodan Arylith.png",
    "url": "https://rugatha.com/2025/06/29/vaerodan-arylith/",
    "race": "Dragonborn"
  },
  {
    "name": "Ms. Valentine",
    "image": "individual_pics/Ms. Valentine.jpeg",
    "url": "https://rugatha.com/2021/06/20/ms-valentine/",
    "race": "Human"
  },
  {
    "name": "Dr. Vaxon",
    "image": "individual_pics/Dr. Vaxon.jpeg",
    "url": "https://rugatha.com/2023/08/21/dr-vaxon/",
    "race": "Human"
  },
  {
    "name": "Valero Berners",
    "image": "individual_pics/Valero Berners.jpeg",
    "url": "https://rugatha.com/2023/08/21/valero-berners/",
    "race": "Human"
  },
  {
    "name": "Wesley Vance",
    "image": "individual_pics/Wesley Vance.png",
    "url": "https://rugatha.com/2023/01/15/wesley-vance/",
    "race": "Human"
  },
  {
    "name": "Willem",
    "image": "individual_pics/Willem.jpeg",
    "url": "https://rugatha.com/2022/03/13/willem/",
    "race": "Human"
  },
  {
    "name": "Lord Wind",
    "image": "individual_pics/Lord Wind.jpeg",
    "url": "https://rugatha.com/2022/11/07/lord-wind/",
    "race": "Human"
  },
  {
    "name": "Xandria, the Violet of Macksohn",
    "image": "individual_pics/Xandria, the Violet of Macksohn.jpeg",
    "url": "https://rugatha.com/2021/12/27/xandria-the-violet-of-macksohn/",
    "race": "Halfling"
  },
  {
    "name": "Xavier",
    "image": "individual_pics/Xavier.jpeg",
    "url": "https://rugatha.com/2022/04/25/xavier/",
    "race": "Human"
  },
  {
    "name": "Yashin Usta",
    "image": "individual_pics/Yashin Usta.jpeg",
    "url": "https://rugatha.com/2023/01/15/yashin-usta/",
    "race": "Human"
  },
  {
    "name": "The Young Mage",
    "image": "individual_pics/The Young Mage.jpeg",
    "url": "https://rugatha.com/2021/09/20/the-young-mage/",
    "race": "Human"
  },
  {
    "name": "Yuki",
    "image": "individual_pics/Yuki.jpeg",
    "url": "https://rugatha.com/2022/12/11/yuki/",
    "race": "Human"
  },
  {
    "name": "Zach",
    "image": "individual_pics/Zach.jpeg",
    "url": "https://rugatha.com/2023/01/30/zach/",
    "race": "Dwarf"
  },
  {
    "name": "Zek",
    "image": "https://rugatha.com/wp-content/uploads/2024/05/zek.jpg",
    "url": "https://rugatha.com/2024/04/18/zek/",
    "race": "Human"
  },
  {
    "name": "慢爆",
    "image": "individual_pics/.DS_Store",
    "url": "https://rugatha.com/2023/05/08/%e6%85%a2%e7%88%86/",
    "race": "Laztek"
  },
  {
    "name": "嘟嘟",
    "image": "individual_pics/.DS_Store",
    "url": "https://rugatha.com/2023/08/21/%e5%98%9f%e5%98%9f/",
    "race": "Dog"
  },
  {
    "name": "酷爆",
    "image": "individual_pics/.DS_Store",
    "url": "https://rugatha.com/2021/07/03/%e9%85%b7%e7%88%86/",
    "race": "Wolf"
  },
  {
    "name": "雪寶",
    "image": "individual_pics/.DS_Store",
    "url": "https://rugatha.com/2023/08/21/%e9%9b%aa%e5%af%b6/",
    "race": "Elemental"
  },
  {
    "name": "臭皮",
    "image": "individual_pics/.DS_Store",
    "url": "https://rugatha.com/2024/04/18/%e8%87%ad%e7%9a%ae/",
    "race": "Ratfolk"
  },
  {
    "name": "鼠田佩特拉",
    "image": "individual_pics/.DS_Store",
    "url": "https://rugatha.com/2024/04/18/%e9%bc%a0%e7%94%b0%e4%bd%a9%e7%89%b9%e6%8b%89/",
    "race": "Ratfolk"
  },
  {
    "name": "髒牙",
    "image": "individual_pics/.DS_Store",
    "url": "https://rugatha.com/2024/04/18/%e9%ab%92%e7%89%99/",
    "race": "Ratfolk"
  },
  {
    "name": "伊",
    "image": "individual_pics/.DS_Store",
    "url": "https://rugatha.com/2023/03/20/%e4%bc%8a/",
    "race": "Human"
  },
  {
    "name": "勇哥",
    "image": "individual_pics/.DS_Store",
    "url": "https://rugatha.com/2021/12/27/%e5%8b%87%e5%93%a5/",
    "race": "Horse"
  }
]


# ====== 2. 工具函式 ======

def has_chinese(text: str) -> bool:
    """判斷字串中是否含有任何中文字。"""
    return any('\u4e00' <= ch <= '\u9fff' for ch in text)

def clean_text(text: str) -> str:
    """簡單清洗字串：去頭尾空白、把連續空白壓成一格。"""
    text = text.strip()
    text = re.sub(r'\s+', ' ', text)
    return text

def extract_title(soup, fallback: str) -> str:
    """從頁面抓標題，抓不到就用 JSON name 當後備。"""
    h1 = soup.find('h1', class_='entry-title') or soup.find('h1')
    if h1:
        return clean_text(h1.get_text())
    return fallback

def extract_paragraphs(url: str):
    """從 URL 抓出中文段落列表 & 英文段落列表。"""
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"[ERROR] 無法讀取 {url}: {e}")
        return [], []

    soup = BeautifulSoup(resp.text, 'html.parser')

    # 主要內容區通常在 div.entry-content 裡；抓不到就退而求其次抓 article 內所有 <p>
    content = soup.find('div', class_='entry-content') or soup.find('article') or soup

    all_paras = []
    for p in content.find_all('p'):
        text = clean_text(p.get_text())
        if not text:
            continue
        # 過濾掉明顯不是內容的東西（可以視狀況再調整）
        if '電子郵件 (必要)' in text or '發表迴響' in text:
            continue
        if text.lower().startswith('share this') or text.lower().startswith('leave a reply'):
            continue
        all_paras.append(text)

    zh_paras = [t for t in all_paras if has_chinese(t)]
    en_paras = [t for t in all_paras if not has_chinese(t)]

    return zh_paras, en_paras, soup

# ====== 3. 主流程：逐一處理每個角色，寫入同一個 txt 檔 ======

output_path = Path("rugatha_npcs_bilingual.txt")

with output_path.open("w", encoding="utf-8") as f:
    for idx, char in enumerate(characters, start=1):
        name = char.get("name", "").strip()
        url = char.get("url", "").strip()
        if not url:
            print(f"[WARN] {name} 沒有 URL，略過。")
            continue

        print(f"[{idx}/{len(characters)}] 處理：{name}  ->  {url}")

        zh_paras, en_paras, soup = extract_paragraphs(url)

        # 抓標題（優先頁面上的 h1 文字）
        title = extract_title(soup, fallback=name)

        zh_block = "\n".join(zh_paras) if zh_paras else ""
        en_block = "\n".join(en_paras) if en_paras else ""

        # === 寫入檔案，依你指定的結構 ===
        f.write(title + "\n")
        f.write(zh_block + "\n")
        f.write(en_block + "\n")
        f.write("\n" + "-" * 60 + "\n\n")

print(f"完成！已輸出到：{output_path.resolve()}")
