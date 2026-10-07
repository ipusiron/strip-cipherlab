// Strip CipherLab の画面の文言（JS が出すもの）。globalThis.StripMessages に置く。
// {name} の置き場所は t() で埋める。html.* は index.html の data-i18n・data-i18n-attr の文言（日本語は HTML と同じ）。
(function (root) {
  "use strict";

  const MESSAGES = {
    ja: {
      "sep.clause": "、",
      "sep.list": "・",

      "common.noOrder": "装着順が決まっていません。ストリップ作成タブでストリップを作ってください。",

      "toast.copyFailed": "コピーに失敗しました",
      "toast.cipherCopied": "暗号文をコピーしました",
      "toast.plainCopied": "平文（候補）をコピーしました",
      "toast.plainCleared": "平文をクリアしました",
      "toast.cipherCleared": "暗号文をクリアしました",
      "toast.synced": "暗号化タブの暗号文を写しました",
      "toast.gapsRerolled": "群ごとの段差を振り直しました",
      "toast.autoGaps": "点数が1位の段差を選びました",

      "build.noStrips": "上の設定からストリップを生成してください",
      "build.generated": "ランダムなストリップを{count}本作り、先頭から{count}本を装着順にしました。",
      "build.generatedPass": "合言葉からストリップを{count}本作り、先頭から{count}本を装着順にしました。",
      "build.needPassphrase": "合言葉を入力してください。",

      "strip.line": "{line}行目（{length}文字）",
      "strip.duplicates": "重なった文字{letters}",
      "strip.missing": "足りない文字{letters}",
      "strip.tooMany": "ストリップは{max}本までです。",
      "strip.empty": "乱字列がありません。1行に26文字ずつ入力してください。",
      "strip.sameCycle": "ストリップ{list}は、滑らせると同じ並びです（暗号が弱くなります）。",
      "strip.valid": "OK：{count}本ともA〜Zの26文字が1回ずつです。",
      "strip.applied": "{count}本のストリップを作り、先頭から{count}本を装着順にしました。",
      "strip.notApplied": "次の行を直すまで、ストリップは作りません。",

      "frame.position": "位置{n}",
      "frame.moveLeft": "ストリップ{strip}（位置{pos}）を左へ",
      "frame.moveRight": "ストリップ{strip}（位置{pos}）を右へ",
      "frame.tooMany": "使用本数（{use}本）がストリップの本数（{count}本）を超えています。ストリップ作成タブで増やしてください。",
      "frame.first": "先頭から{use}本を並べました。",
      "frame.keyEmpty": "鍵語に英字がありません。",
      "frame.keyTooLong": "鍵語が{length}文字で、ストリップの本数（{count}本）より多いため決められません。ストリップを増やすか、鍵語を短くしてください。",
      "frame.keyOk": "鍵語{letters}の割当は{ranks}。この番号のストリップを左から並べ、使用本数を{use}本にしました。",
      "frame.order.empty": "ストリップ番号を入力してください（例：3, 1, 2）。",
      "frame.order.notNumber": "数ではないものがあります：{bad}",
      "frame.order.outOfRange": "1〜{count}の範囲にない番号があります：{bad}",
      "frame.order.duplicate": "同じストリップを2回は使えません：{bad}",
      "frame.orderOk": "{use}本を指定の順に並べました。",

      "window.gap": "段差",
      "window.plainRow": "平文",
      "window.cipherRow": "暗号文",
      "window.position": "位置",
      "window.pickGap": "段差{gap}の行を選ぶ",

      "group.label": "群{n}/{total}",
      "group.none": "群0/0",

      "enc.dropped": "英字以外の文字（{chars}）は使いません。空白と改行も無視します。",
      "enc.groupsPerGroup": "平文{length}文字を{r}文字ずつ{groups}群に分け、群ごとに段差を変えて暗号化します。段差は受け手に知らせません。",
      "enc.groupsFixed": "平文{length}文字を{r}文字ずつ{groups}群に分け、どの群も同じ段差{gap}で暗号化します。段差を固定すると、周期{r}の多表式換字に退化します（座学）。",
      "enc.gapList": "群ごとの段差（送り手の控え。受け手には知らせない）：{list}",
      "enc.groupText": "平文{plain} → 暗号文{cipher}（段差{gap}）",
      "enc.groupEmpty": "平文を入力すると、ストリップが滑って平文の文字が最上段にそろいます。",
      "ic.noCipher": "暗号文ができると、Day047へ渡せます。",
      "ic.tooManyStrips": "使用本数が{max}本を超えています。Day047が調べる周期は{max}までです。",
      "ic.tooLong": "暗号文が{max}字を超えています。Day047が受け取るのは{max}字までです。",
      "ic.short": "暗号文が{n}字と短いので、周期が見えにくいことがあります（数百字が目安）。",
      "ic.ready": "暗号文{n}字を渡します。棒グラフで周期{r}とその倍数が高いかを見てください。候補の一覧では、{r}の約数が先に並ぶことがあります。",

      "dec.dropped": "英字以外の文字（{chars}）は無視します。",
      "dec.groupText": "暗号文{cipher} → 平文の候補{plain}（段差{gap}、点数{score}、{rank}位）",
      "dec.gapList": "選んだ段差：{list}",

      "cand.titleEmpty": "候補の行",
      "cand.titleGroup": "候補の行（群{n}、点数の高い順）",
      "cand.titleFixed": "候補（全文を同じ段差で復号、点数の高い順）",
      "cand.short": "この群は{n}文字と短いので、点数の1位が正しいとは限りません。前後の群とつなげて読んでください。",
      "cand.rank": "{n}位",
      "cand.noScore": "－",
      "cand.pick": "段差{gap}の候補を選ぶ（{rank}位、点数{score}）",

      "dec.groupEmpty": "暗号文を入力すると、ストリップが滑って暗号文の文字が最下段にそろいます。",

      "html.subtitle": "ストリップ暗号の仕組みを視覚的に学べる対話型教育ツール",

      "html.langButton": "EN",

      "html.tab.build": "ストリップ作成",
      "html.tab.frame": "ストリップ初期設定",
      "html.tab.enc": "暗号化",
      "html.tab.dec": "復号",
      "html.tab.study": "座学",

      "html.build.h2Gen": "ストリップ生成",
      "html.build.count": "本数（1〜100）：",
      "html.build.btnRandom": "ランダム生成",
      "html.build.passphrase": "合言葉：",
      "html.build.btnPass": "合言葉から生成",
      "html.build.note1": "・ランダム生成は、A〜Zを偏りのない乱数（crypto.getRandomValues）で並べ替えた乱字列を、本数分作ります。",
      "html.build.note2": "・合言葉から生成は、同じ合言葉と本数から、いつも同じストリップの一式を作ります（送り手と受け手がストリップをそろえる練習用）。決まった手順の擬似乱数なので、合言葉を推測されるとストリップも再現されます。大文字と小文字は区別します。",
      "html.build.h2Text": "ストリップの乱字列（1行1本）",
      "html.build.btnValidate": "重複・欠落チェック",
      "html.build.btnApply": "この乱字列でストリップを作る",
      "html.build.h2Strips": "生成されたストリップ（52文字ずつ）",
      "html.build.hintStrips": "各ストリップは26文字の乱字列を2回続けた52文字です（端で止まらずに上下へ滑らせるため）",

      "html.frame.h2": "装着順の決め方",
      "html.frame.useCount": "使用本数（先頭から）：",
      "html.frame.btnFirst": "先頭から採用",
      "html.frame.key": "鍵語（文字数＝使用本数）：",
      "html.frame.btnKey": "鍵語から決める",
      "html.frame.manual": "ストリップ番号を並べる（カンマ区切り）：",
      "html.frame.btnOrder": "この順にする",
      "html.frame.current": "現在の装着順（左から、ストリップ番号）：",
      "html.frame.h2Strips": "ストリップ配置",
      "html.frame.hintStrips": "ストリップをドラッグするか、◀ ▶ のボタンで並べ替えられます",

      "html.enc.h2Plain": "平文",
      "html.enc.btnClear": "クリア",
      "html.enc.h2Cipher": "暗号文",
      "html.enc.btnCopy": "コピー",
      "html.enc.h2Window": "使用中のストリップ配置",

      "html.gapLabel": "段差：",

      "html.gapModeLegend": "段差の決め方",

      "html.enc.modeGroup": "群ごとに変える（実際の運用）",

      "html.modeFixed": "全部の群で同じ",

      "html.enc.btnReroll": "段差を振り直す",
      "html.enc.hintWindow": "平文の文字が最上段（段差0）にそろうようストリップを滑らせ、段差の行（青）を横に読むと暗号文になります。左の行番号を押しても段差を選べます。",

      "html.dec.h2Cipher": "暗号文",
      "html.dec.btnSync": "暗号化タブから写す",
      "html.dec.btnClear": "クリア",
      "html.dec.h2Plain": "平文（候補）",
      "html.dec.btnCopy": "コピー",
      "html.dec.h2Window": "使用中のストリップ配置（復号）",
      "html.dec.modeGroup": "群ごとに選ぶ",
      "html.dec.btnAuto": "点数1位を選ぶ（自動推定）",

      "html.cand.hint": "点数は、英語で隣り合う2文字の出やすさ（自然対数）の平均です。0に近いほど英語らしい行です。行を押すと、その段差を選びます。",
      "html.cand.thRank": "順位",
      "html.cand.thGap": "段差",
      "html.cand.thText": "候補",
      "html.cand.thScore": "点数",

      "html.dec.hintWindow": "暗号文の文字が最下段にそろうようストリップを滑らせると、その上の25行が平文の候補（段差-1〜-25）です。行を横に読み、読める行を探してください。",

      "html.study.h2": "概要",
      "html.study.p": "ストリップ暗号は、ランダム順のアルファベットを印字した帯（ストリップ）を多数並べ、平文行とは別の行を暗号文として読み出す換字式暗号です。",
      "html.study.h3Steps": "手順",
      "html.study.step1": "平文を使用本数r文字ずつの群に分ける。",
      "html.study.step2": "群の文字が1行（段差0）にそろうよう、装着順のストリップを上下に滑らせる。",
      "html.study.step3": "ほかの25行から1行を選んで暗号文にする（段差）。受け手には段差を知らせない。",
      "html.study.step4": "受け手は暗号文を1行にそろえ、ほかの25行を横に読んで、読める行を平文として採用する。",
      "html.study.h3Points": "重要ポイント",
      "html.study.point1": "段差は群ごとに変える。全部の群で同じ段差を使うと、周期rの多表式換字に退化し、周期ごとの一致指数（IC）でrが見えてくる。暗号化タブの「段差の決め方」で、群ごとに変えるか、全部の群で同じにするかを選べる。",
      "html.study.point2": "復号では、群ごとに25の候補の行を英語らしさの点数で並べられる。群が短いと、偶然に英語らしく見える外れの行が1位になることがある。",
      "html.study.point3": "段差は1〜25なので、平文の文字が同じ文字に暗号化されることはない。解読の手がかりにもなる性質である。",
      "html.study.point4": "ストリップは輪になっていないので、26文字を2回続けて印字し、端で止まらずにそろえられるようにする。",
      "html.study.point5": "滑らせると同じ並びになる2本は、同じストリップとして働く（区別できる並びは25!通り）。",
      "html.study.point6": "鍵語による装着順（アルファベット順の割当、同じ文字は左から若い番号）は一例で、ほかの割当もある。",
      "html.study.h3History": "歴史",
      "html.study.hist1": "ジェファソンのホイール暗号とバゼリーの円筒を帯の形に伸ばしたもので、1914年にパーカー・ヒットが提案した。",
      "html.study.hist2": "米陸軍のM-138-Aは100本から30本を使い、国務省も1930年代末から最も重要な通信に使った。",
      "html.study.hist3": "ドイツ外務省の解読部門は、国務省のストリップ暗号O-2の50本と40通りの日鍵を復元した（TICOM I-89）。",
      "html.study.hist4": "日本はウェーク島とキスカで米海軍のストリップを手に入れ解読を試みたが、特務班は最後に事実上解けないものとみなした。",
      "html.study.source": "出典はREADMEの「歴史メモ」と「参考文献」にある（Kahn『The Codebreakers』、TICOM I-89）。",

      "html.footer.repo": "🔗 GitHubリポジトリ：",

      "html.langLabel": "英語に切り替える",

      "html.tablist": "手順",

      "html.build.passPlaceholder": "例：STRIP",

      "html.frame.keyPlaceholder": "例：The strip cipher",
      "html.frame.manualPlaceholder": "例：3, 1, 2",

      "html.enc.plainPlaceholder": "平文を入力（英字だけを使います）",
      "html.enc.cipherPlaceholder": "暗号文がここに表示されます",
      "html.enc.icTitle": "周期を確かめる（段差を固定したときの弱さ）",
      "html.enc.icHint": "全部の群で同じ段差にした長い暗号文をIC Learning Visualizer（Day047）に渡すと、使用本数の周期とその倍数で、列のICが言語の値に戻ります。群ごとに段差を変えた暗号文と比べてください。",
      "html.enc.btnSample": "見本の長文を平文に入れる",
      "html.enc.linkIc": "周期ごとのICを見る（Day047）",
      "html.enc.upAria": "暗号文の行を1段上へ（段差を1減らす）",
      "html.enc.downAria": "暗号文の行を1段下へ（段差を1増やす）",

      "html.prevGroup": "前の群",

      "html.nextGroup": "次の群",

      "html.dec.cipherPlaceholder": "暗号文を入力（英字以外は無視）",
      "html.dec.plainPlaceholder": "段差を操作して読める平文を探します",
      "html.dec.upAria": "平文候補の行を1段上へ（段差を1増やす）",
      "html.dec.downAria": "平文候補の行を1段下へ（段差を1減らす）",
    },
    en: {
      "sep.clause": ", ",
      "sep.list": ", ",

      "common.noOrder": "No strip order is set. Create strips on the Build strips tab.",

      "toast.copyFailed": "Copy failed",
      "toast.cipherCopied": "Ciphertext copied",
      "toast.plainCopied": "Plaintext (candidate) copied",
      "toast.plainCleared": "Plaintext cleared",
      "toast.cipherCleared": "Ciphertext cleared",
      "toast.synced": "Copied the ciphertext from the Encrypt tab",
      "toast.gapsRerolled": "Offsets per group were re-drawn",
      "toast.autoGaps": "Selected the top-scoring offsets",

      "build.noStrips": "Create strips with the settings above",
      "build.generated": "Random strips created: {count}. The strip order now uses all of them from the first.",
      "build.generatedPass": "Strips created from the passphrase: {count}. The strip order now uses all of them from the first.",
      "build.needPassphrase": "Enter a passphrase.",

      "strip.line": "Line {line} (length {length})",
      "strip.duplicates": "repeated: {letters}",
      "strip.missing": "missing: {letters}",
      "strip.tooMany": "Up to {max} strips are allowed.",
      "strip.empty": "No mixed alphabets. Enter 26 letters per line.",
      "strip.sameCycle": "Strips {list} have the same order when slid (this weakens the cipher).",
      "strip.valid": "OK: each of A–Z appears exactly once on every line (lines: {count}).",
      "strip.applied": "Strips created: {count}. The strip order now uses all of them from the first.",
      "strip.notApplied": "No strips are created until these lines are fixed.",

      "frame.position": "Position {n}",
      "frame.moveLeft": "Move strip {strip} (position {pos}) to the left",
      "frame.moveRight": "Move strip {strip} (position {pos}) to the right",
      "frame.tooMany": "Strips to use ({use}) exceed the strips available ({count}). Add strips on the Build strips tab.",
      "frame.first": "Using the strips from the first (strips used: {use}).",
      "frame.keyEmpty": "The keyword has no letters A–Z.",
      "frame.keyTooLong": "The keyword has {length} letters, more than the strips available ({count}), so the order cannot be set. Add strips or shorten the keyword.",
      "frame.keyOk": "Keyword {letters} gives {ranks}. The strips with these numbers are placed from the left (strips used: {use}).",
      "frame.order.empty": "Enter strip numbers (e.g., 3, 1, 2).",
      "frame.order.notNumber": "Not a number: {bad}",
      "frame.order.outOfRange": "Not in 1–{count}: {bad}",
      "frame.order.duplicate": "A strip cannot be used twice: {bad}",
      "frame.orderOk": "Placed the strips in the given order (strips used: {use}).",

      "window.gap": "Offset",
      "window.plainRow": "Plain",
      "window.cipherRow": "Cipher",
      "window.position": "Pos.",
      "window.pickGap": "Select the row at offset {gap}",

      "group.label": "Group {n}/{total}",
      "group.none": "Group 0/0",

      "enc.dropped": "Characters other than letters ({chars}) are not used. Spaces and line breaks are ignored too.",
      "enc.groupsPerGroup": "The plaintext ({length} letters) is split into groups of {r} (groups: {groups}), each enciphered with its own offset. The offsets are not sent to the receiver.",
      "enc.groupsFixed": "The plaintext ({length} letters) is split into groups of {r} (groups: {groups}), all enciphered with the same offset {gap}. A fixed offset turns this into a periodic polyalphabetic substitution with period {r} (see Study).",
      "enc.gapList": "Offsets per group (sender's note, not sent to the receiver): {list}",
      "enc.groupText": "Plaintext {plain} → ciphertext {cipher} (offset {gap})",
      "enc.groupEmpty": "Type plaintext and the strips slide so its letters line up on the top row.",
      "ic.noCipher": "Once there is a ciphertext, you can pass it to Day047.",
      "ic.tooManyStrips": "More than {max} strips are used. Day047 checks periods up to {max}.",
      "ic.tooLong": "The ciphertext is longer than {max} letters. Day047 accepts up to {max}.",
      "ic.short": "The ciphertext is short (length {n}), so the period may be hard to see (a few hundred letters is a good guide).",
      "ic.ready": "Passes the ciphertext (length {n}). In the bar chart, check that period {r} and its multiples are high. In the candidate list, a divisor of {r} may come first.",

      "dec.dropped": "Characters other than letters ({chars}) are ignored.",
      "dec.groupText": "Ciphertext {cipher} → candidate {plain} (offset {gap}, score {score}, rank {rank})",
      "dec.gapList": "Chosen offsets: {list}",

      "cand.titleEmpty": "Candidate rows",
      "cand.titleGroup": "Candidate rows (group {n}, by score)",
      "cand.titleFixed": "Candidates (whole text with one offset, by score)",
      "cand.short": "This group is short (length {n}), so the top-scoring row may be wrong. Read it together with the neighboring groups.",
      "cand.rank": "#{n}",
      "cand.noScore": "–",
      "cand.pick": "Select the candidate at offset {gap} (rank {rank}, score {score})",

      "dec.groupEmpty": "Type ciphertext and the strips slide so its letters line up on the bottom row.",

      "html.subtitle": "An interactive tool to see how the strip cipher works",

      "html.langButton": "JA",

      "html.tab.build": "Build strips",
      "html.tab.frame": "Strip order",
      "html.tab.enc": "Encrypt",
      "html.tab.dec": "Decrypt",
      "html.tab.study": "Study",

      "html.build.h2Gen": "Generate strips",
      "html.build.count": "Strips (1–100):",
      "html.build.btnRandom": "Random",
      "html.build.passphrase": "Passphrase:",
      "html.build.btnPass": "From passphrase",
      "html.build.note1": "• Random creates mixed alphabets (A–Z shuffled with unbiased random numbers from crypto.getRandomValues), one per strip.",
      "html.build.note2": "• From passphrase always creates the same set of strips from the same passphrase and count (practice for the sender and receiver to share strips). It is a fixed pseudo-random procedure, so anyone who guesses the passphrase can rebuild the strips. Upper and lower case differ.",
      "html.build.h2Text": "Mixed alphabets (one strip per line)",
      "html.build.btnValidate": "Check repeated / missing letters",
      "html.build.btnApply": "Create strips from these lines",
      "html.build.h2Strips": "Generated strips (52 letters each)",
      "html.build.hintStrips": "Each strip is a 26-letter mixed alphabet printed twice (52 letters), so it can slide up and down without running out.",

      "html.frame.h2": "Setting the strip order",
      "html.frame.useCount": "Strips used (from the first):",
      "html.frame.btnFirst": "Use from the first",
      "html.frame.key": "Keyword (letters = strips used):",
      "html.frame.btnKey": "Order by keyword",
      "html.frame.manual": "Strip numbers in order (comma-separated):",
      "html.frame.btnOrder": "Use this order",
      "html.frame.current": "Current order (strip numbers from the left): ",
      "html.frame.h2Strips": "Strip arrangement",
      "html.frame.hintStrips": "Drag a strip, or use the ◀ ▶ buttons, to reorder.",

      "html.enc.h2Plain": "Plaintext",
      "html.enc.btnClear": "Clear",
      "html.enc.h2Cipher": "Ciphertext",
      "html.enc.btnCopy": "Copy",
      "html.enc.h2Window": "Strips in use",

      "html.gapLabel": "Offset: ",

      "html.gapModeLegend": "Offsets",

      "html.enc.modeGroup": "Per group (as used in practice)",

      "html.modeFixed": "Same for all groups",

      "html.enc.btnReroll": "Re-draw offsets",
      "html.enc.hintWindow": "The strips slide so the plaintext letters line up on the top row (offset 0). Read the blue row across to get the ciphertext. You can also pick an offset with the row labels on the left.",

      "html.dec.h2Cipher": "Ciphertext",
      "html.dec.btnSync": "Copy from Encrypt tab",
      "html.dec.btnClear": "Clear",
      "html.dec.h2Plain": "Plaintext (candidate)",
      "html.dec.btnCopy": "Copy",
      "html.dec.h2Window": "Strips in use (decryption)",
      "html.dec.modeGroup": "Choose per group",
      "html.dec.btnAuto": "Pick the top score (auto)",

      "html.cand.hint": "The score is the average log-probability (natural log) of adjacent letter pairs in English. Rows closer to 0 look more like English. Click a row to select its offset.",
      "html.cand.thRank": "Rank",
      "html.cand.thGap": "Offset",
      "html.cand.thText": "Candidate",
      "html.cand.thScore": "Score",

      "html.dec.hintWindow": "The strips slide so the ciphertext letters line up on the bottom row; the 25 rows above are the plaintext candidates (offsets -1 to -25). Read each row across and look for one that reads.",

      "html.study.h2": "Overview",
      "html.study.p": "The strip cipher lines up many strips printed with mixed alphabets, aligns the plaintext on one row, and reads another row as the ciphertext. It is a substitution cipher.",
      "html.study.h3Steps": "Steps",
      "html.study.step1": "Split the plaintext into groups of r letters (r = strips used).",
      "html.study.step2": "Slide the strips in the strip order so the group lines up on one row (offset 0).",
      "html.study.step3": "Pick one of the other 25 rows as the ciphertext (the offset). The offset is not sent to the receiver.",
      "html.study.step4": "The receiver lines up the ciphertext on one row, reads the other 25 rows across, and takes the one that reads as the plaintext.",
      "html.study.h3Points": "Key points",
      "html.study.point1": "Change the offset for each group. With one offset for all groups the cipher becomes a periodic polyalphabetic substitution with period r, and the index of coincidence (IC) per period reveals r. On the Encrypt tab, choose per group or one offset under “Offsets”.",
      "html.study.point2": "When decrypting, the 25 candidate rows of each group can be ranked by an English-likeness score. In a short group, a wrong row can look like English by chance and rank first.",
      "html.study.point3": "Offsets are 1–25, so no plaintext letter is enciphered as itself. Codebreakers also use this property.",
      "html.study.point4": "Strips are not loops, so each mixed alphabet is printed twice and the letters can line up without running off the end.",
      "html.study.point5": "Two strips that match when slid act as the same strip (there are 25! distinct orders).",
      "html.study.point6": "The keyword order (alphabetical numbering, with repeated letters numbered from the left) is one example; other methods exist.",
      "html.study.h3History": "History",
      "html.study.hist1": "It is the Jefferson wheel cipher and the Bazeries cylinder stretched out into strips, proposed by Parker Hitt in 1914.",
      "html.study.hist2": "The U.S. Army M-138-A used 30 of 100 strips at a time, and the State Department used it for its most important communications from the late 1930s.",
      "html.study.hist3": "The German Foreign Office codebreakers recovered all 50 strips and 40 day keys of the State Department strip cipher O-2 (TICOM I-89).",
      "html.study.hist4": "Japan captured U.S. Navy strips on Wake and Kiska and tried to break them, but its codebreakers finally judged the strip cipher unbreakable for all practical purposes.",
      "html.study.source": "Sources are listed in the README sections “History notes” and “References” (Kahn, The Codebreakers; TICOM I-89).",

      "html.footer.repo": "🔗 GitHub repository: ",

      "html.langLabel": "Switch to Japanese",

      "html.tablist": "Steps",

      "html.build.passPlaceholder": "e.g., STRIP",

      "html.frame.keyPlaceholder": "e.g., The strip cipher",
      "html.frame.manualPlaceholder": "e.g., 3, 1, 2",

      "html.enc.plainPlaceholder": "Enter plaintext (only letters A–Z are used)",
      "html.enc.cipherPlaceholder": "The ciphertext appears here",
      "html.enc.icTitle": "Check the period (the weakness of a fixed offset)",
      "html.enc.icHint": "Pass a long ciphertext made with one offset for all groups to IC Learning Visualizer (Day047): the IC of the columns returns to the language value at the period equal to the strips used and its multiples. Compare it with a ciphertext whose offsets change per group.",
      "html.enc.btnSample": "Put a long sample in the plaintext",
      "html.enc.linkIc": "See the IC per period (Day047)",
      "html.enc.upAria": "Move the cipher row up (offset -1)",
      "html.enc.downAria": "Move the cipher row down (offset +1)",

      "html.prevGroup": "Previous group",

      "html.nextGroup": "Next group",

      "html.dec.cipherPlaceholder": "Enter ciphertext (non-letters are ignored)",
      "html.dec.plainPlaceholder": "Change the offset to find readable plaintext",
      "html.dec.upAria": "Move the candidate row up (offset +1)",
      "html.dec.downAria": "Move the candidate row down (offset -1)",
    },
  };

  function format(text, params) {
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (params && Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : m));
  }

  function t(lang, key, params) {
    const table = MESSAGES[lang] || MESSAGES.ja;
    const text = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : MESSAGES.ja[key];
    return format(text === undefined ? key : text, params);
  }

  root.StripMessages = { MESSAGES, format, t };
})(typeof globalThis !== "undefined" ? globalThis : this);
