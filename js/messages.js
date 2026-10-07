// Strip CipherLab の画面の文言（JS が出すもの）。globalThis.StripMessages に置く。
// {name} の置き場所は t() で埋める。英語は第2弾の日英対応で足す。
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

      "dec.dropped": "英字以外の文字（{chars}）は無視します。",
      "dec.groupText": "暗号文{cipher} → 平文の候補{plain}（段差{gap}）",
      "dec.groupEmpty": "暗号文を入力すると、ストリップが滑って暗号文の文字が最下段にそろいます。",
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
