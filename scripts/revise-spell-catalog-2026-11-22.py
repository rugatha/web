"""Apply reviewed 2014 PHB translation corrections to an external catalog copy.
Usage: python3 scripts/revise-spell-catalog-2026-11-22.py SOURCE_DIR OUTPUT_DIR
Never sorts spells or changes English identifiers. Source SHA is pinned below.
"""
import hashlib,json,re,sys
from pathlib import Path
if len(sys.argv)!=3:
 raise SystemExit('Usage: python3 scripts/revise-spell-catalog-2026-11-22.py SOURCE_DIR OUTPUT_DIR')
source,output=map(Path,sys.argv[1:])
repository=Path(__file__).resolve().parents[1]
if any(path.resolve().is_relative_to(repository) for path in [source,output]):
 raise SystemExit('Catalog sources and outputs must stay outside the repository.')
raw=(source/'spells-phb.json').read_bytes()
assert hashlib.sha256(raw).hexdigest()=='0d1745e0565461a88006fdf68e483c604d471968a051eea61f0ead9a3d0ccd46'
data=json.loads(raw); spells={s['name_en']:s for s in data['spell']}
changes=set()
def edit(name,path,value):
 obj=spells[name]
 for part in path[:-1]:obj=obj[part]
 obj[path[-1]]=value;changes.add(name)
def replace(name,old,new):
 def walk(v):
  if isinstance(v,str):return v.replace(old,new)
  if isinstance(v,list):return [walk(a) for a in v]
  if isinstance(v,dict):return {k:walk(a) if not k.endswith('_en') else a for k,a in v.items()}
  return v
 s=spells[name]; result=walk(s);assert result!=s,(name,old);s.update(result);changes.add(name)
def paragraph(name,index,text):edit(name,['entries',index],text)
# Consistent rules terms. Only Chinese display fields are changed, never schema/IDs.
terms={'體質':'體魄','憲法檢定':'體魄檢定','憲法豁免':'體魄豁免','情報檢定':'智力檢定','輻射傷害':'光輝傷害','冰冷傷害':'寒冷傷害','毒藥傷害':'毒素傷害','雷電傷害':'雷鳴傷害','雷霆傷害':'雷鳴傷害','力傷害':'力場傷害','抵抗力':'抗性','臨時生命值':'暫時生命值','最大生命值':'生命值上限','長時間的休息':'長休','長時間休息':'長休','儲存失敗':'豁免失敗','成功儲存':'豁免成功','控製':'控制','普通樣本':'一般個體','遊戲統計數據':'遊戲數據','遊戲統計資料':'遊戲數據','構裝生物體':'構裝生物','構裝體':'構裝生物','構造體':'構裝生物','存在平面':'存在位面','平面旅行':'位面旅行','每個輪':'每個回合','下一個輪':'下個回合','下一輪':'下個回合','後續輪':'後續回合','隨後的輪':'隨後的回合','一個輪中':'一個回合中','一個輪':'一個回合','每輪':'每回合','其輪':'其回合','你的輪':'你的回合','結束輪':'結束回合','開始輪':'開始回合','輪到你的附贈動作':'你回合中的附贈動作','轉彎開始時':'回合開始時','結束轉彎':'結束回合','滾動主動權':'擲先攻','滾動主動':'擲先攻','滾動':'擲骰','無人居住的空間':'未佔據的空間','每個輪中':'每個回合中','任何多餘的傷害都會恢復到正常狀態':'超出的傷害會由原本形態承受','任何剩餘的傷害都會恢復到其原始物件形態':'超出的傷害會由原本的物件形態承受','它保留了其一致性和個性':'它保留原有的陣營與個性','對齊方式':'陣營','更高層次':'升環施法','神奇的沉默':'魔法沉默','地球儀':'法球','針對地球的':'針對法球的','槽位':'法術位','口袋維度':'異次元空間','協調':'同調'}
# Fix mixed simplified characters without converting English or 5etools markup.
simplified=str.maketrans({'个': '個',
 '这': '這',
 '并': '並',
 '对': '對',
 '为': '為',
 '从': '從',
 '会': '會',
 '时': '時',
 '间': '間',
 '体': '體',
 '术': '術',
 '当': '當',
 '无': '無',
 '与': '與',
 '级': '級',
 '来': '來',
 '过': '過',
 '后': '後',
 '点': '點',
 '击': '擊',
 '伤': '傷',
 '气': '氣',
 '动': '動',
 '复': '複',
 '敌': '敵',
 '环': '環',
 '场': '場',
 '围': '圍',
 '见': '見',
 '观': '觀',
 '觉': '覺',
 '听': '聽',
 '说': '說',
 '话': '話',
 '读': '讀',
 '写': '寫',
 '书': '書',
 '风': '風',
 '云': '雲',
 '电': '電',
 '轻': '輕',
 '护': '護',
 '将': '將',
 '发': '發',
 '让': '讓',
 '进': '進',
 '变': '變',
 '传': '傳',
 '门': '門',
 '开': '開',
 '关': '關',
 '实': '實',
 '现': '現',
 '仅': '僅',
 '须': '須',
 '强': '強',
 '远': '遠',
 '视': '視',
 '线': '線',
 '内': '內',
 '没': '沒',
 '够': '夠',
 '获': '獲',
 '临': '臨',
 '态': '態',
 '恶': '惡',
 '兽': '獸',
 '宠': '寵',
 '鱼': '魚',
 '马': '馬',
 '龙': '龍',
 '岛': '島',
 '区': '區',
 '别': '別',
 '样': '樣',
 '数': '數',
 '据': '據',
 '统': '統',
 '计': '計',
 '尽': '盡',
 '满': '滿',
 '万': '萬',
 '亿': '億',
 '两': '兩',
 '种': '種',
 '选': '選',
 '择': '擇',
 '战': '戰',
 '斗': '鬥',
 '称': '稱',
 '语': '語',
 '标': '標',
 '记': '記',
 '结': '結',
 '启': '啟',
 '烧': '燒',
 '热': '熱',
 '奖': '獎',
 '励': '勵',
 '唤': '喚',
 '设': '設',
 '备': '備',
 '装': '裝',
 '携': '攜',
 '带': '帶',
 '连': '連',
 '续': '續',
 '处': '處',
 '于': '於',
 '虚': '虛',
 '拟': '擬',
 '伪': '偽',
 '隐': '隱',
 '显': '顯',
 '颜': '顏',
 '蓝': '藍',
 '绿': '綠',
 '红': '紅',
 '黄': '黃',
 '银': '銀',
 '铜': '銅',
 '铁': '鐵',
 '毁': '毀',
 '销': '銷',
 '仑': '侖',
 '么': '麼',
 '户': '戶',
 '转': '轉',
 '换': '換',
 '飞': '飛',
 '离': '離',
 '灵': '靈',
 '质': '質',
 '础': '礎',
 '调': '調',
 '额': '額',
 '减': '減',
 '冻': '凍',
 '创': '創',
 '纳': '納',
 '许': '許',
 '决': '決',
 '断': '斷',
 '惧': '懼',
 '丝': '絲',
 '网': '網',
 '绳': '繩',
 '绑': '綁',
 '缚': '縛',
 '缠': '纏',
 '绕': '繞',
 '织': '織',
 '单': '單',
 '双': '雙',
 '项': '項',
 '问': '問',
 '题': '題',
 '讯': '訊',
 '认': '認',
 '识': '識',
 '随': '隨',
 '机': '機',
 '齐': '齊',
 '众': '眾',
 '尸': '屍',
 '赋': '賦',
 '应': '應',
 '尝': '嘗',
 '试': '試',
 '窥': '窺',
 '损': '損',
 '坏': '壞',
 '稳': '穩',
 '维': '維',
 '储': '儲',
 '败': '敗',
 '约': '約',
 '总': '總',
 '余': '餘',
 '毕': '畢',
 '终': '終',
 '厂': '廠',
 '扬': '揚',
 '蝎': '蠍',
 '尔': '爾',
 '踪': '蹤',
 '虑': '慮',
 '块': '塊',
 '检': '檢',
 '辐': '輻',
 '辉': '輝',
 '庄': '莊',
 '严': '嚴',
 '审': '審',
 '谨': '謹'})

simplified.update(str.maketrans({'价':'價','树':'樹','头':'頭','响':'響','们':'們','弹':'彈','叶':'葉','团':'團','几':'幾','寻':'尋','猎':'獵','况':'況','坟':'墳','颗':'顆','玛':'瑪','适':'適','愿':'願','编':'編','费':'費','着':'著','炽':'熾','剑':'劍','鸟':'鳥','导':'導','镶':'鑲','蝾':'蠑','腌':'醃','铅':'鉛','萤':'螢','虫':'蟲','藓':'蘚','圣':'聖','饰':'飾','确':'確','递':'遞','议':'議','状':'狀','协':'協','喷':'噴','壳':'殼','细':'細','简':'簡','询':'詢','经':'經','馅':'餡','饼':'餅','飘':'飄','纵':'縱','笔':'筆','贵':'貴','闪':'閃','烁':'爍','茎':'莖','胶':'膠','缕':'縷','烟':'煙','雾':'霧'}))

def clean(v):
 if isinstance(v,str):
  # Markup names must remain usable as English lookup IDs.
  parts=re.split(r'(\{@[^}]+})',v)
  for j,p in enumerate(parts):
   if p.startswith('{@'):continue
   p=p.translate(simplified).replace('\u200b','')
   for a,b in terms.items():p=p.replace(a,b)
   p=re.sub(r'(\d+)\s*級或更高等級的法術位',r'\1 環或更高環級的法術位',p)
   p=re.sub(r'(\d+)\s*級法術位',r'\1 環法術位',p)
   p=re.sub(r'(\d+)\s*級或更低等級的法術',r'\1 環或更低環級的法術',p)
   p=re.sub(r'(\d+)\s*級或更高等級的法術',r'\1 環或更高環級的法術',p)
   parts[j]=p
  return ''.join(parts)
 if isinstance(v,list):return [clean(a) for a in v]
 if isinstance(v,dict):return {k:(clean(a) if k not in ['type','colStyles','name_en'] else a) for k,a in v.items()}
 return v
fields=['entries','entriesHigherLevel','time','range','duration','components','damageInflict','savingThrow']
for s in data['spell']:
 for f in fields:
  if f in s:
   v=clean(s[f])
   if v!=s[f]:s[f]=v;changes.add(s['name_en'])
# Concrete mistranslations that alter game rules.
replace('Alarm','小型或大型生物','微型或更大型的生物');replace('Alarm','此 ping 訊號','這個心靈提示')
replace('Animal Messenger','小型野獸','微型野獸');replace('Animal Messenger','其他動物則每 25 哩','其他動物每 24 小時約行進 25 哩')
replace('Animal Shapes','在隨後的輪中','在隨後的回合中') if '在隨後的輪中' in str(spells['Animal Shapes']['entries']) else None
paragraph('Animate Objects',0,'你使物件活化。選擇施法距離內至多十件未被穿戴或攜帶的非魔法物件。中型物件算兩件、大型算四件、巨型算八件；無法選擇比巨型更大的物件。每個目標成為受你控制的生物，直到法術結束或該目標生命值降至 0。')
replace('Animate Objects','動畫物件','活化物件');replace('Animate Objects','的結構','的構裝生物')
replace('Antimagic Field','被壓制在球體中，無法伸入其中','在球體內受到壓制，且不能延伸進入球體');replace('Antimagic Field','火焰被抑制在球體內','火焰在球體內受到壓制')
replace('Antipathy/Sympathy','同情','共感');replace('Antipathy/Sympathy','當目標{@condition frightened|恐慌}時','當生物因此{@condition frightened|恐慌}時')
replace('Arms of Hadar','在下個回合之前無法做出反應','直到它下個回合開始前無法使用反應')
paragraph('Augury',0,'你透過擲下鑲寶石的籤杖、龍骨，排列華麗的卡牌或其他占卜工具，向超自然存在求取預兆，得知你計畫在接下來 30 分鐘內採取的特定行動可能帶來的結果。DM 選擇下列一種預兆：')
edit('Augury',['entries',1,'items'],['吉：結果良好','凶：結果不佳','吉凶參半：兼有好壞結果','無兆：結果既非特別好，也非特別壞'])
replace('Bigby\'s Hand','使用你的遊戲數據對手進行近戰法術攻擊','使用你的遊戲數據，從這隻手的位置對目標進行近戰法術攻擊')
replace('Bigby\'s Hand','透過目標的力量（{@skill Athletics|運動}）檢定來檢定對手的力量','以這隻手的力量檢定，對抗目標的力量（{@skill Athletics|運動}）檢定')
replace('Blink','在你的下個回合開始時，如果你在以太位面，當法術結束時','在你的下個回合開始時，或法術結束且你仍在以太位面時')
replace('Branding Smite','則傷害會變得可見','則目標會變得可見')
replace('Calm Emotions','如果目標受到法術攻擊或傷害','如果目標受到攻擊或被法術傷害')
replace('Chain Lightning','只能被一根螺栓瞄準','只能被其中一道閃電選為目標')
paragraph('Circle of Power',0,'神聖能量從你身上散發，干擾周圍 30 呎內的魔法能量。此範圍以你為中心，隨你移動，直到法術結束。範圍內每個友善生物（包括你）對抗法術與其他魔法效果的豁免檢定具有優勢。此外，若這類效果通常允許目標以豁免成功來減半傷害，受影響的生物豁免成功時改為完全不受傷害。')
paragraph('Color Spray',1,'從目前生命值最低的生物開始，依序扣除每個生物的目前生命值。只有目前生命值不超過剩餘擲骰總值的生物才受影響，並目盲直到你的下個回合結束；再以扣除後的剩餘總值判定下一個生物。')
replace('Command','方法','靠近');replace('Command','降低','放下');replace('Command','在輪到你時','在它的回合中')
paragraph('Confusion',0,'你扭曲生物的心智，引發幻覺與失控行為。施放此法術時，以施法距離內你選擇的一點為中心，10 呎半徑球體內的每個生物都必須進行感知豁免檢定；失敗者受到此法術影響。')
replace('Contact Other Plane','無法採取行動','陷入失能')
paragraph('Contingency',0,'選擇一個你能施放、環級不高於 5 環、施法時間為 1 個動作且能以你為目標的法術。施放觸發術時一併施放該「預存法術」，並消耗兩個法術各自需要的法術位。預存法術不會立刻生效，而是在你施法時指定的條件首次發生後立即生效。例如，預存水下呼吸，並指定當你浸入水或類似液體時觸發。')
paragraph('Contingency',1,'條件首次發生後，預存法術立即生效，無論你是否願意；觸發術隨即結束。')
paragraph('Contingency',2,'預存法術只影響你，即使通常可以指定其他目標。你同時只能受一個觸發術影響；再次施放時，先前的觸發術結束。若作為觸發術材料成分的雕像不再由你隨身攜帶，觸發術也會結束。')
replace('Control Water','部分水','分水');replace('Control Water','重定向流程','改變水流');replace('Control Water','大型或小型車輛','巨型或更小的載具')
replace('Cordon of Arrows','受影響的彈藥量就會增加 2 倍','受影響的彈藥數量就增加 2 枚')
replace('Crusader\'s Mantle','在受到武器攻擊時會造成額外的','以武器攻擊命中時，造成額外的')
replace('Create or Destroy Water','你要麼創造水，要麼毀滅水','選擇造水或毀水效果')
replace('Disguise Self','你無法改變你的體型','你無法改變身體的基本構造')
replace('Disintegrate','一個大型或小型的非魔法物體','一個大型或更小的非魔法物體')
replace('Dispel Evil and Good','解僱','放逐');replace('Dispel Evil and Good','暗影地獄','墮影之地');replace('Dispel Evil and Good','（如果它尚不存在）','（若它目前不在該位面）')
replace('Divine Word','（如果它尚不存在）','（若它目前不在該位面）');replace('Divine Word','無法通過 {@spell wish|祈願術} 法術以任何方式返回','除非藉由 {@spell wish|祈願術}，否則無法返回')
edit('Druidcraft',['entries',1,'items',3],'你立刻點燃或熄滅一支蠟燭、一把火把或一小堆營火。')
replace('Enhance Ability','貓的恩典','貓之優雅');replace('Enhance Ability','雄鷹的輝煌','鷹之威儀')
replace('Ensnaring Strike','藤蔓旁的生物 {@condition restrained|束縛} 或可以接觸該生物的生物','受到藤蔓束縛的生物，或能觸及它的其他生物')
replace('Entangle','植物旁的生物 {@condition restrained|束縛}','受到植物束縛的生物')
replace('Etherealness','你所在的飛機','你原本所在的位面')
replace('Fear','在你視線之外的位置','在無法看見你的位置')
paragraph('Find Familiar',1,'DM 可酌情允許其他動物形態。')
replace('Find Familiar','它會主動擲骰並按自己的輪行動','它會自行擲先攻，並在自己的回合行動');replace('Find Familiar','你可以永遠忽略它','你可以永久遣散它')
replace('Find Steed','無論是在戰鬥中還是在戰鬥中','無論是在戰鬥中或戰鬥外')
replace('Flame Blade','可以持續很長時間','在法術持續時間內存在');replace('Flame Blade','獎勵動作','附贈動作')
replace('Freedom of Movement','處於水下不會對目標的移動或攻擊造成任何影響','處於水下不會對目標的移動或攻擊施加減益')
replace('Giant Insect',' A centipede becomes a {@creature giant centipede}, a spider becomes a {@creature giant spider}, a wasp becomes a {@creature giant wasp}, and a scorpion becomes a {@creature giant scorpion}.','蜈蚣、蜘蛛、黃蜂與蠍子分別變為巨蜈蚣、巨蜘蛛、巨黃蜂與巨蠍。')
replace('Glyph of Warding','如果法術需要{@status concentration}，它會持續到其整個持續時間結束','若法術通常需要專注，此時不需專注，並持續完整的法術持續時間')
replace('Guards and Wards','50 平方呎的面積','邊長 50 呎的正方形');replace('Guards and Wards','5 平方呎的區域','5 呎見方的區域');replace('Guards and Wards','病房','結界');replace('Guards and Wards','守衛和守衛','衛士與結界')
paragraph('Gust of Wind',0,'一道長 60 呎、寬 10 呎的強風從你向指定方向吹出，持續到法術結束。每個在風力線形區域內開始回合的生物都必須進行力量豁免檢定；失敗時，沿風向被推離你 15 呎。')
paragraph('Gust of Wind',1,'此線形區域內的生物朝你移動時，每移動 1 呎需花費 2 呎移動力。')
paragraph('Gust of Wind',3,'法術結束前，你可在自己的每個回合用附贈動作改變強風吹出的方向。')
replace('Hallow','其中一些效果適用於該區域的生物；其他則適用於該區域的生物','其中一些效果適用於該區域中的生物')
replace('Hallow','容易受到你選擇的一種傷害類型的影響','對你選擇的一種傷害類型具有易傷');replace('Hallow','該區域內無法發出任何聲音，也無法進入該區域','聲音無法在該區域內產生，也無法傳入該區域')
replace('Haste','僅限一種武器攻擊','僅限一次武器攻擊');replace('Haste','在下個回合之前無法移動或採取行動','直到它下個回合結束前，都無法移動或採取動作')
replace('Heroes\' Feast','最多十二種生物','最多十二個生物');replace('Heroes\' Feast','對毒藥免疫並處於{@condition frightened|恐慌}狀態','免疫毒素與{@condition frightened|恐慌}狀態')
replace('Identify','多少電荷','多少充能次數')
replace('Imprisonment','則再次施放該法術將免疫該法術','則目標免疫你之後再次施放的此法術');replace('Imprisonment','對沖監獄','隔絕牢獄');replace('Imprisonment','最低限度遏制','微縮囚禁');replace('Imprisonment','葬禮','埋葬');replace('Imprisonment','神性','神祇')
replace('Jump','會增加三倍','變為三倍')
paragraph('Knock',1,'目標若以普通鎖上鎖、卡住或以門閂封住，便會解鎖、鬆開或移開門閂。若目標有多道鎖，此法術只解開其中一道。')
replace('Lightning Bolt','隊伍中的每個生物','此線形區域內的每個生物')
replace('Magic Jar','投射到容器外 100 呎之外','投射到容器周圍 100 呎內');replace('Magic Jar','你保留自己班級功能的優勢','你保留自己職業特性的好處');replace('Magic Jar','如果宿主生物距離你 100 呎以內','如果容器距離你 100 呎以內');replace('Magic Jar','而該生物的靈魂還活著且在 100 呎內','且該生物的身體仍活著並在容器 100 呎內')
paragraph('Mass Heal',0,'你釋放治療能量，恢復合計至多 700 點生命值，由你分配給施法距離內可見的任意數量生物。受治療的生物也會治癒所有疾病，並結束使其目盲或耳聾的效果。此法術對不死生物與構裝生物無效。')
replace('Meld into Stone','智慧（','感知（');replace('Meld into Stone','你可以用你的動作將石頭留在你進入的地方','你可以使用移動，從進入的位置離開石頭')
replace('Misty Step','傳送到 30 呎外','傳送到 30 呎內')
replace('Otiluke\'s Freezing Sphere','30 平方呎的區域','30 呎見方的區域')
paragraph('Otiluke\'s Resilient Sphere',1,'任何物質、能量或其他法術效果都不能穿過屏障進出，但球內生物仍可呼吸。球體免疫所有傷害；球內的生物或物件不受球外的攻擊與效果傷害，球內生物也無法傷害球外的任何事物。')
replace('Otto\'s Irresistible Dance','使用其所有的動作來跳舞','用盡所有移動力跳舞')
replace('Passwall','不會對其周圍的結構裝生物成不穩定','不會使周圍的結構變得不穩定')
replace('Prismatic Spray','重新擲骰任 8 個','若擲出 8 則重擲')
replace('Prismatic Wall','橘子','橙色');replace('Prismatic Wall','紅色的','紅色');replace('Prismatic Wall','黃色的','黃色');replace('Prismatic Wall','綠色的','綠色');replace('Prismatic Wall','藍色的','藍色')
replace('Ray of Enfeeblement','使用力量的武器攻擊只會對目標造成一半傷害','目標以力量進行的武器攻擊，只造成一半傷害')
paragraph('Rope Trick',3,'法術結束時，異次元空間內的所有事物都會掉落出來。')
replace('Sanctuary','任何以攻擊或有害法術為目標的被守護生物','任何試圖以攻擊或有害法術指定受保護生物為目標的生物')
paragraph('Sending',1,'你可以跨越任意距離，甚至跨越位面傳送訊息；若目標與你位於不同位面，訊息有 5% 機率無法送達。')
replace('Shapechange','特殊意義','特殊感官');replace('Shapechange','該含義','該感官');replace('Shapechange','被它磨損','由新形態穿戴');replace('Shapechange','磨損的設備','穿戴的裝備')
replace('Shocking Grasp','在下個回合開始之前無法做出反應','直到它下個回合開始前無法使用反應')
paragraph('Sleep',1,'從目前生命值最低的生物開始，依序扣除每個生物的目前生命值。只有目前生命值不超過剩餘擲骰總值的生物才受影響，陷入昏迷直到法術結束、受到傷害，或有人用一個動作搖醒或拍醒它；再以扣除後的剩餘總值判定下一個生物。')
replace('Speak with Plants','工廠','植物')
replace('Spiritual Weapon','其持續時間持續到你再次施展法術為止','持續到法術持續時間結束，或直到你再次施放此法術')
replace('Staggering Smite','刺穿你的身體和心靈','刺穿目標的身體與心靈');replace('Staggering Smite','直到下個回合結束','直到它下個回合結束')
replace('Sunbeam','隊列中的每個生物','此線形區域內的每個生物');replace('Sunbeam','在你的下個回合之前處於 {@condition blinded|目盲} 傷害','直到你的下個回合開始前陷入 {@condition blinded|目盲}')
replace('Sunburst','從這個角度來看，每個生物','此光照區域內的每個生物')
replace('Symbol','令人驚嘆的','震懾');replace('Symbol','無法攻擊或瞄準任何具有有害能力、法術或其他魔法效果的生物','無法攻擊，也無法用有害的能力、法術或其他魔法效果指定任何生物為目標')
replace('Telekinesis','目的','物件');replace('Telekinesis','大型或更小的生物','巨型或更小的生物')
replace('Thorn Whip','如果該生物較大或更小，則將生物拉近 10 呎','若該生物為大型或更小，可將其拉近至多 10 呎')
replace('Tsunami','會移動到距離你 50 呎的地方','會向遠離你的方向移動 50 呎')
replace('Unseen Servant','直到你完成任務','直到它完成任務');replace('Unseen Servant','無形、中等力量','無形、中型的力場')
replace('Wall of Stone','利用其反應來提高其速度','利用反應移動至多等於其速度的距離');replace('Wall of Stone','每塊面板的每英吋厚度具有 AC 15 和 30 點','每塊面板的 AC 為 15，生命值為每英吋厚度 30 點')
replace('Wall of Thorns','刷子牆，刷子上長滿了針尖的刺','灌木牆，枝條上布滿針尖般的刺');replace('Wall of Thorns','就必須移動 4 呎','就必須花費 4 呎移動力')
replace('Warding Bond','每次受到傷害時，你都會受到','每當目標受到傷害時，你也受到')
replace('Wind Wall','箭、螺栓','箭、弩矢')
replace('Wish','非魔法物品物品','非魔法物品');replace('Wish','你授予最多 10 個可以看到對你選擇的傷害類型的抗性的生物','你使至多十個你能看見的生物，對你選擇的一種傷害類型具有抗性')
replace('Wish','最後，如果你承受這種壓力，你有可能無法再次實現願望','最後，承受此負擔時，你有 33% 機率永久失去施放祈願術的能力')
replace('Wrathful Smite','下次你使用近戰武器攻擊時','下次你以近戰武器攻擊命中時')
# Translate every table cell rather than hiding the English tables.
def tables(v):
 if isinstance(v,list):
  for a in v:yield from tables(a)
 elif isinstance(v,dict):
  if 'rows' in v:yield v
  for a in v.values():yield from tables(a)
translated={
'Control Weather':[['晴朗','少雲','陰天或地面有霧','降雨、冰雹或降雪','豪雨、猛烈冰雹或暴風雪'],['酷熱難耐','炎熱','溫暖','涼爽','寒冷','極地嚴寒'],['無風','和風','強風','烈風','暴風']],
'Creation':[['植物性材料','石頭或水晶','貴金屬','寶石','精金或秘銀']],
'Scrying':[['間接了解（聽說過目標）','親身接觸（見過目標）','熟悉（非常了解目標）'],['肖像或圖片','隨身物品或衣物','身體部位、頭髮、指甲碎片等']],
'Teleport':[['永久傳送法陣','關聯物品','非常熟悉','偶爾見過','見過一次','描述得知','虛假目的地']],
'Reincarnate':[['龍裔','丘陵矮人','山地矮人','黑暗精靈','高等精靈','木精靈','森林地侏','岩地地侏','半精靈','半獸人','輕足半身人','強壯半身人','人類','提夫林']]}
for name,groups in translated.items():
 ts=list(tables(spells[name]['entries']));assert len(ts)==len(groups)
 for t,labels in zip(ts,groups):
  assert len(t['rows'])==len(labels)
  for row,label in zip(t['rows'],labels):row[1 if name=='Control Weather' or name=='Reincarnate' else 0]=label
  if name=='Reincarnate':t['colLabels'][0]='d100'
  if name=='Creation':
   for row,duration in zip(t['rows'],['1 日','12 小時','1 小時','10 分鐘','1 分鐘']):row[1]=duration
 changes.add(name)
t=next(tables(spells['Confusion']['entries']));t['colLabels'][0]='d10'
for row,text in zip(t['rows'],['生物用盡移動力朝隨機方向移動。擲 d8 並為各骰面指定方向；本回合不採取動作。','生物本回合不移動，也不採取動作。','生物用動作對觸及範圍內一個隨機生物進行一次近戰攻擊；若範圍內沒有生物，本回合便什麼也不做。','生物可以正常移動與行動。']):row[1]=text
changes.add('Confusion')
t=next(tables(spells['Animate Objects']['entries']))
for row,size in zip(t['rows'],['微型','小型','中型','大型','巨型']):
 row[0]=size;row[3]=row[3].replace(' to hit, ',' 命中，').replace(' damage',' 傷害')
# Resolve reference markup to localized display text throughout Chinese entries.
# English lookup identities are retained in name_en and *_en.
lookup={s['name_en'].lower():s['name_zh'] for s in data['spell']}
refs={'concentration':'專注','concentrating':'維持專注','exhaustion':'力竭','grappled':'擒抱','deaf':'耳聾','blind':'目盲','blindness':'目盲','deafness':'耳聾','darkvision':'黑暗視覺','truesight':'真實視覺','difficult terrain':'困難地形','half cover':'半掩護','three-quarters cover':'四分之三掩護','total cover':'全掩護','heavily obscured':'重度遮蔽','lightly obscured':'輕度遮蔽','school of magic':'魔法學派','jump distance':'跳躍距離','attack':'攻擊','dash':'疾走','disengage':'撤離','hide':'躲藏','use an object':'使用物件','perception':'觀察','stealth':'隱藏','survival':'求生','arcana':'奧術','animal handling':'馴服動物','sleight of hand':'扒手','acrobatics':'特技動作','persuasion':'說服','divine sense':'神聖感知','dragonborn':'龍裔','human':'人類','tiefling':'提夫林','skeleton':'骷髏','zombie':'殭屍','ghoul':'食屍鬼','ghouls':'食屍鬼','ghast':'妖鬼','ghasts':'妖鬼','wight':'屍妖','wights':'屍妖','mummy':'木乃伊','mummies':'木乃伊','bat':'蝙蝠','cat':'貓','crab':'螃蟹','frog':'青蛙','hawk':'鷹','lizard':'蜥蜴','octopus':'章魚','owl':'貓頭鷹','poisonous snake':'毒蛇','quipper':'食人魚','rat':'老鼠','raven':'渡鴉','sea horse':'海馬','spider':'蜘蛛','weasel':'鼬','warhorse':'戰馬','pony':'矮種馬','camel':'駱駝','elk':'麋鹿','mastiff':'獒犬','giant wasp':'巨黃蜂','fire elemental':'火元素','earth elemental':'土元素','awakened shrub':'覺醒灌木','awakened tree':'覺醒樹木','minotaur':'牛頭人','goristro':'戈里斯托惡魔','unicorn':'獨角獸','tarrasque':'泰拉斯奎巨獸','lich':'巫妖','arrow':'箭','arrows':'箭','crossbow bolt':'弩矢','crossbow bolts':'弩矢','chest':'箱子','manacles':'鐐銬','club':'木棒','quarterstaff':'長棍','troglodyte\'s':'穴居蜥蜴人'}
refs.update(lookup)
def markup(m):
 tag,body=m[1].lower(),m[2];p=body.split('|');name=p[0].strip();lower=name.lower()
 if tag=='filter':
  kind=next((zh for en,zh in [('celestial','天界生物'),('elemental','元素生物'),('fey','精類生物'),('beast','野獸'),('divination spells','預言學派法術')] if en in lower),None)
  if not kind:kind='邪魔' if lower=='fiend' else None
  cr=re.search(r'(?:rating |^)(\d+(?:/\d+)?) or lower',lower)
  if kind:return ('挑戰等級不高於 '+cr[1]+' 的' if cr else '')+('大型或更小的' if 'large or smaller' in lower else '')+kind
 if tag in ['spell','condition','status','sense','skill','action','book','quickref','classfeature','creature','race','item']:
  display=(p[2] if len(p)>2 and p[2] else p[1] if len(p)==2 else name)
  return refs.get(display.lower(),refs.get(lower,display))
 if tag=='chance':return name+'%'
 return m[0]
def resolve(v):
 if isinstance(v,str):return re.sub(r'\{@(\w+) ([^}]+)}',markup,v)
 if isinstance(v,list):return [resolve(a) for a in v]
 if isinstance(v,dict):return {k:resolve(a) if k not in ['type','name_en','colStyles'] else a for k,a in v.items()}
 return v
for s in data['spell']:
 for f in fields:
  if f in s:
   v=resolve(s[f])
   if v!=s[f]:s[f]=v;changes.add(s['name_en'])
# Clarify per-slot-level scaling, preserving all numerical effects.
def polish(v, higher=False):
 if isinstance(v,str):
  v=v.replace('服务','服務').replace('采用','採用').replace('对抗','對抗').replace('其回合流','自己的回合').replace('自己的輪','自己的回合')
  v=v.replace('為顯示的內容選擇以下選項之一','從以下召喚選項中選擇一項').replace('你可以為顯示的內容選擇以下選項之一','你可以從以下召喚選項中選擇一項')
  v=v.replace('一 挑戰等級','一隻挑戰等級').replace('兩 挑戰等級','兩隻挑戰等級').replace('四個 挑戰等級','四隻挑戰等級').replace('八個挑戰等級','八隻挑戰等級')
  v=v.replace('DM 有the celestial 的統計','DM 提供該天界生物的數據')
  v=v.replace('使用5 環','使用 5 環').replace('使用2 環','使用 2 環').replace('使用3 環','使用 3 環').replace('使用4 環','使用 4 環').replace('使用6 環','使用 6 環').replace('使用7 環','使用 7 環').replace('使用8 環','使用 8 環').replace('使用9 環','使用 9 環')
  if higher:
   v=re.sub(r'每高於\s*(\d+)\s*(?:環法術位|級的法術位等級|級的法術位|級)',r'所用法術位每比 \1 環高一環',v)
   v=re.sub(r'(?:對於|為|每有)?每(?:個)?\s*(\d+)\s*級以上的法術位(?:等級)?',r'所用法術位每比 \1 環高一環',v)
   v=re.sub(r'(?:對於|為)高於\s*(\d+)\s*級的每個法術位',r'所用法術位每比 \1 環高一環',v)
   v=re.sub(r'對於\s*(\d+)\s*級以上的每個法術位',r'所用法術位每比 \1 環高一環',v)
   v=v.replace('每兩個高於 2 級的法術位','所用法術位每比 2 環高兩環')
   v=re.sub(r'(\d+)\s*級',r'\1 環',v)
   v=v.replace('更高等級的法術位','更高環級的法術位').replace('插槽等級','法術位環級')
  return v
 if isinstance(v,list):return [polish(a,higher) for a in v]
 if isinstance(v,dict):return {k:polish(a,higher) if k not in ['type','name_en','colStyles'] else a for k,a in v.items()}
 return v
for s in data['spell']:
 for f in fields:
  if f in s:
   v=polish(s[f],f=='entriesHigherLevel')
   if v!=s[f]:s[f]=v;changes.add(s['name_en'])
for name in ['Conjure Minor Elementals','Conjure Woodland Beings']:
 edit(name,['entriesHigherLevel',0,'entries'],['使用 6 環法術位時，所選召喚選項的生物數量加倍；使用 8 環法術位時，數量變為三倍。'])
edit('Conjure Animals',['entriesHigherLevel',0,'entries'],['使用 5 環法術位時，所選召喚選項的生物數量加倍；使用 7 環法術位時，數量變為三倍；使用 9 環法術位時，數量變為四倍。'])
edit('Etherealness',['entriesHigherLevel',0,'entries'],['使用 8 環或更高環級的法術位時，法術位每比 7 環高一環，可指定的自願生物數量增加三個（包括你在內）。施法時，這些生物都必須在你 10 呎內。'])
edit('Globe of Invulnerability',['entriesHigherLevel',0,'entries'],['使用 7 環或更高環級的法術位時，法術位每比 6 環高一環，可阻擋的法術環級上限提高一環。'])
edit('Modify Memory',['entriesHigherLevel',0,'entries'],['使用 6 環法術位時，可修改過去 7 天內的事件記憶；7 環可修改過去 30 天內，8 環可修改過去 1 年內，9 環可修改目標過去任何時間的事件記憶。'])

# Remaining context-dependent wording; do not conflate a combat round with a turn.
for name in ['Feather Fall','Water Walk','Wind Walk']:
 for f in ['entries']:
  spells[name][f]=[v.replace('每回合 60 呎','每輪 60 呎') if isinstance(v,str) else v for v in spells[name][f]]
replace('Storm of Vengeance','每回合你在這個法術上保持','每輪你在這個法術上保持')
replace('Web','蛛網旁的生物 束縛','被蛛網束縛的生物')
replace('Mending','鬥篷','斗篷')
replace('True Polymorph','如果該法術成為永久性的','若變形因你維持完整持續時間的專注，而持續至被解除')
replace('Shocking Grasp','在下個回合開始之前','在目標下個回合開始之前') if '在下個回合開始之前' in str(spells['Shocking Grasp']['entries']) else None
# Ordinary Chinese terms that were mistranslated as software operations.
def final_text(v):
 if isinstance(v,str):
  for a,b in {'鬥篷':'斗篷','複活':'復活','恢複':'恢復','能力得分':'屬性值','智力得分':'智力值','力量得分':'力量值','力量分數':'力量值','魅力分數':'魅力值','法術等級':'法術環級','有利或不利':'具有優勢或劣勢','在桌子上重新擲骰':'依表重新擲骰','反應動作':'反應'}.items():v=v.replace(a,b)
  return v
 if isinstance(v,list):return [final_text(a) for a in v]
 if isinstance(v,dict):return {k:final_text(a) if k not in ['type','name_en','colStyles'] else a for k,a in v.items()}
 return v
for spell in data['spell']:
 for field in fields:
  if field in spell:
   value=final_text(spell[field])
   if value!=spell[field]:spell[field]=value;changes.add(spell['name_en'])

paragraph('Banishing Smite',0,'法術結束前，你下一次以武器攻擊命中生物時，該攻擊額外造成 {@damage 5d10} 力場傷害。若此次攻擊使目標的生命值降至 50 或更低，你也將它放逐：若目標原生於其他位面，它返回自己的原生位面；若原生於你目前所在的位面，它被送往無害的半位面並陷入失能，直到法術結束。之後它回到離開時的空間；若該處已被佔據，則出現在最近的未佔據空間。')
paragraph('Banishment',2,'若目標的原生位面不同於你目前所在的位面，它會伴隨輕微爆裂聲返回自己的原生位面。若法術在持續滿 1 分鐘前結束，目標便返回離開時的空間；若該處已被佔據，則出現在最近的未佔據空間。若持續滿 1 分鐘，它便不會返回。')
paragraph('Enthrall',0,'你以言語分散生物的注意力。選擇施法距離內你能看見、且能聽見你的生物；每個目標進行感知豁免檢定。免疫魅惑的生物自動成功；若你或同伴正在與某個目標戰鬥，該目標的豁免具有優勢。豁免失敗者，在察覺你以外其他生物的感知（觀察）檢定上具有劣勢，直到法術結束或它聽不見你為止。若你陷入失能或無法說話，法術結束。')
paragraph('Evard\'s Black Tentacles',2,'被觸手束縛的生物可以用一個動作進行力量或敏捷檢定（由它選擇），DC 為你的法術豁免 DC。成功時，它掙脫束縛。')
paragraph('Freedom of Movement',1,'目標還可花費 5 呎移動力，自動掙脫非魔法的束縛，例如鐐銬，或正在擒抱它的生物。此外，水下環境不會對目標的移動或攻擊施加減益。')
paragraph('Time Stop',0,'你短暫停止其他生物的時間流動。在其他生物的時間停止時，你可以連續進行 {@dice 1d4 + 1} 個回合，每個回合都能正常使用動作與移動。')
replace('Wall of Ice','很容易受到火焰傷害','對火焰傷害具有易傷')
replace('Eyebite','眼咬','攝心目光');replace('Eyebite','目標是你的恐慌','目標因你而陷入恐慌');replace('Eyebite','目標落在昏迷','目標陷入昏迷')
replace('Nystul\'s Magic Aura','特定魔法流派','特定魔法學派')
replace('Mirror Image','重複的目標','分身');replace('Mirror Image','如果出現兩次重複','若剩下兩個分身');replace('Mirror Image','重複的一張','若只剩一個分身')
replace('Slow','對於 11 或更高的生物','若骰值為 11 或更高')
replace('Glyph of Warding','你可以儲存任何與你用於守護雕文的法術位環級相同的法術','你可以儲存環級不高於施放守護刻文所用法術位的法術')

# Validate compatibility and serialize the immutable successor release.
original=json.loads(raw)['spell']
assert [s['name_en'] for s in data['spell']]==[s['name_en'] for s in original]
for a,b in zip(original,data['spell']):
 for key in a:
  if key.endswith('_en'):assert a[key]==b[key],(a['name_en'],key)
 assert '__標籤' not in json.dumps(b,ensure_ascii=False)
assert source.resolve()!=output.resolve()
output.mkdir(parents=True,exist_ok=True)
(output/'spells-phb.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(output/'class_spells.json').write_bytes((source/'class_spells.json').read_bytes())
print(f'Updated {len(changes)} spells; retained all 361 English IDs and their order.')
for file in output.iterdir():
 b=file.read_bytes();print(file.name,len(b),hashlib.sha256(b).hexdigest())
