"""Produce the follow-up Taiwan terminology release from the immutable v1 catalog.
Usage: python3 scripts/polish-toolbox-spells-2026-11-22.py /outside/v1 /outside/v2
"""
import hashlib,json,re,shutil,sys
from pathlib import Path
source,out=map(lambda p:Path(p).resolve(),sys.argv[1:3]);repo=Path(__file__).resolve().parents[1]
if out.is_relative_to(repo) or source.is_relative_to(repo):raise ValueError('Catalogs must remain outside the repository')
p=source/'spells-phb.json'
if hashlib.sha256(p.read_bytes()).hexdigest()!='a34b676e9a170610b164aa49a8d84bba184f76092231f2d96144f1aabac0d14f':raise ValueError('Expected the immutable v1 source')
d=json.loads(p.read_text());before=json.loads(p.read_text());terms={'英寸':'英吋','復制':'複製','複制':'複製','信息':'資訊','幾率':'機率','概率':'機率','克隆術':'複製術','克隆體':'複製體','被克隆':'被複製','創建':'建立','傳感器':'感測器','交互':'互動','答復':'答覆','統計數據':'數值','房源':'宅邸','一只':'一隻','暗示目標':'暗示目標','空靈位面':'以太位面'}
def polish(v):
 if isinstance(v,str):
  for a,b in terms.items():v=v.replace(a,b)
  v=re.sub(r'([1-9])\s*級法術',r'\1 環法術',v)
  return v
 if isinstance(v,list):return [polish(x) for x in v]
 if isinstance(v,dict):return {k:x if k.endswith('_en') else polish(x) for k,x in v.items()}
 return v
d=polish(d);sp={s['name_en']:s for s in d['spell']}
sp['Cloudkill']['entries'][0]='你在距離內選擇一點，形成半徑 20 呎的黃綠色毒霧球體。霧氣可繞過轉角，範圍內為重度遮蔽。霧氣持續至法術結束，或被強風吹散而提前結束。'
sp['Cloudkill']['entries'][2]='在你的每個回合開始時，霧氣沿地表向遠離你的方向移動 10 呎。毒霧比空氣重，會沉到地勢最低處，甚至沿開口向下流入。'
sp['Stinking Cloud']['entries']=['你在距離內選擇一點，形成半徑 20 呎、令人作嘔的黃色氣體球體。雲霧可繞過轉角，範圍內為重度遮蔽，並在法術持續期間停留於空中。','生物在自己的回合開始時，若完全位於雲霧內，須進行一次對抗毒素的體魄豁免。失敗時，該回合的動作用於乾嘔與暈眩。不需呼吸或免疫毒素的生物，自動通過此豁免。','中等強度的風（時速至少 10 哩）在 4 輪後吹散雲霧；強風（時速至少 20 哩）則在 1 輪後吹散。']
sp['Fog Cloud']['entries'][0]='你在距離內選擇一點，形成半徑 20 呎的霧球體。霧氣可繞過轉角，範圍內為重度遮蔽。霧氣持續至法術結束，或被中等強度以上的風（時速至少 10 哩）吹散。'
sp['Incendiary Cloud']['entries'][0]='你在距離內選擇一點，形成半徑 20 呎、夾雜白熱餘燼的旋轉煙雲。煙雲可繞過轉角，範圍內為重度遮蔽。煙雲持續至法術結束，或被中等強度以上的風（時速至少 10 哩）吹散。'
sp['Insect Plague']['entries'][0]='你在距離內選擇一點，形成半徑 20 呎、充滿噬咬蝗蟲的球體。蟲群可繞過轉角，並在法術持續期間留在原處。範圍內為輕度遮蔽及困難地形。'
sp['Sleet Storm']['entries'][0]='在法術結束前，以你在距離內選擇的一點為中心、半徑 40 呎、高 20 呎的圓柱範圍內降下凍雨與雨夾雪。範圍內為重度遮蔽，暴露的火焰會被撲滅。'
sp['Otiluke\'s Resilient Sphere']['entries'][2]='球體沒有重量，大小恰好能容納其中的生物或物體。內部生物可用自己的動作推動球壁，讓球體以不超過該生物一半速度的速度滾動。其他生物也能將球體拿起並移動。'
sp['Hallucinatory Terrain']['entries'][0]='你使距離內一個邊長 150 呎立方體範圍的自然地形，在視覺、聲音與氣味上呈現另一種自然地形。例如，把田野或道路變得像沼澤、丘陵、裂谷或其他難以通行的地形；讓池塘看似草地、懸崖看似緩坡，或讓岩石遍布的溝壑看似寬闊平坦的道路。範圍內人造建築、裝備與生物的外觀不變。'
sp['Modify Memory']['entries'][1]='在此魅惑持續期間，你可改變目標對一件事件的記憶。該事件必須發生在過去 24 小時內，且事件本身持續不超過 10 分鐘。你可永久抹除該事件的記憶、讓它精確回想完整細節、改變它記得的細節，或植入另一件事件的記憶。'
sp['Clone']['components']['m']['text']='價值至少 1,000 gp 的鑽石，以及被複製生物至少 1 立方英吋的血肉，兩者皆由法術消耗；另需價值至少 2,000 gp、有可密封蓋子且足以容納該生物的容器，例如大型甕、棺材、地下充滿泥土的囊室，或裝滿鹽水的水晶容器'
sp['Simulacrum']['entries'][0]='你以冰或雪塑造一隻野獸或一個類人生物的幻象複製體；原生物在整段施法時間內都必須位於施法距離內。複製體是部分真實的生物，能採取動作，也會如同一般生物般受到效果影響。其外觀與原生物相同，生命值上限為原生物的一半，形成時沒有裝備。其餘數值皆使用原生物的數值，但生物類型改為構裝生物。'
sp['Tsunami']['entries'][2]=sp['Tsunami']['entries'][2].replace('一個生物每回合只能承受一次這種傷害。輪結束時','每個生物每輪只能承受一次這種傷害。在你的回合結束時').replace('任何巨大或較小的生物','任何巨型或更小的生物')
# Repair quick-reference tags that an older translation reduced to their section number.
def repair(v):
 if isinstance(v,str):
  return v.replace('使它們成為2','使其成為重度遮蔽').replace('並且為 2','並且為重度遮蔽')
 if isinstance(v,list):return [repair(x) for x in v]
 if isinstance(v,dict):return {k:x if k.endswith('_en') else repair(x) for k,x in v.items()}
 return v
d=repair(d)
# Pin identity and every existing English field, recursively.
def check(a,b):
 if isinstance(a,dict):
  for k in a:
   if k.endswith('_en'):assert a[k]==b[k],k
   else:check(a[k],b[k])
 elif isinstance(a,list):
  assert len(a)==len(b)
  for u,v in zip(a,b):check(u,v)
check(before,d)
assert [(x['name_en'],x['level']) for x in before['spell']]==[(x['name_en'],x['level']) for x in d['spell']]
out.mkdir(parents=True,exist_ok=True);(out/'spells-phb.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(source/'class_spells.json',out/'class_spells.json')
for name in ['spells-phb.json','class_spells.json']:
 data=(out/name).read_bytes();print(name,len(data),hashlib.sha256(data).hexdigest())
print('Changed spells:',sum(a!=b for a,b in zip(before['spell'],d['spell'])))
