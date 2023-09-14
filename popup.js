/**********************************************************************
 * 変更履歴
 * 2023-09-14
 * ・(ぴよ将棋)棋譜リンクから開いた場合、手合いが取得できないためデフォルトで"平手"をセット
 * 
 * 2023-07-10
 * ・クリップボードにコピーする機能を追加
 * 
 * 2022-11-19
 * ・(将棋ウォーズ)棋譜の先手、後手の表示が▲または△から、☗または☖に変更されたことに対応
 * ・(将棋ウォーズ)英語表記の棋譜には未対応である旨の文言を追加（次のバージョンで対応しようかな）
 * 
 * 2022-05-31 
 * ・Kif for シリーズに対応（実のところSJIS対応ではなく、拡張子をkifuにすることで対応）
 * ・将棋ウォーズのリンク版（Twitterリンクからの表示）に対応
 * ・ピヨ将棋の手合割を反映するよう変更
 * ・81道場で成銀、成桂が読み込めないバグに対応
**********************************************************************/

document.getElementById("btn-81").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: export_kif,
    args: ['81'],
  });
});

document.getElementById("btn-kaki").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: export_kif,
    args: ['kif for'],
  });
});

document.getElementById("btn-clip").addEventListener("click", async () => {
  window.close();

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: export_kif,
    args: ['clip'],
  });
});

function export_kif(enc) {
  function single_to_double(num) {
    return String(num).replace(/[A-Za-z0-9]/g, function (s) {
      return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
    });
  }

  function int_to_kansuji(num) {
    kansuji = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    return kansuji[Number(num)]
  }

  function zero_padding(num, count) {
    return ('0'.repeat(count) + String(num)).slice(-count);
  }

  function format_timestamp() {
    let now = new Date();
    return zero_padding(now.getFullYear(), 4) + zero_padding((now.getMonth() + 1), 2) + zero_padding(now.getDate(), 2) + '_' + zero_padding(now.getHours(), 2) + zero_padding(now.getMinutes(), 2) + zero_padding(now.getSeconds(), 2);
  }

  function replace_teai(teai) {
    //「平手」、「香落ち」、「右香落ち」、「角落ち」、「飛車落ち」、「飛香落ち」、「二枚落ち」、「三枚落ち」、「四枚落ち」、「五枚落ち」、「左五枚落ち」、「六枚落ち」、「左七枚落ち」、「右七枚落ち」、「八枚落ち」、「十枚落ち」、「その他」
    switch (teai) {
      case '平手':
        return 'hirate';
      case '香落ち':
        return 'kyo-drop';
      case '右香落ち':
        return 'right-kyo-drop';
      case '角落ち':
        return 'kaku-drop';
      case '飛車落ち':
        return 'hisha-drop';
      case '飛香落ち':
        return 'hikyo-drop';
      case '二枚落ち':
        return '2drop';
      case '三枚落ち':
        return '3drop';
      case '四枚落ち':
        return '4drop';
      case '五枚落ち':
        return '5drop';
      case '左五枚落ち':
        return 'left5drop';
      case '六枚落ち':
        return '6drop';
      case '左七枚落ち':
        return 'left7drop';
      case '右七枚落ち':
        return 'right7drop';
      case '八枚落ち':
        return '8drop';
      case '十枚落ち':
        return '10drop';
      default:
        return '';
    }
  }

  function generate_filename(src) {
    if (enc == '81') {
      return src + '.kif'
    } else {
      return src + '.kifu'
    }

  }

  function export_to_file(records) {
    let data = records.join('\r\n');

    if (enc == 'clip') {
      navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
        if (result.state === "granted" || result.state === "prompt") {
          /* write to the clipboard now */
          navigator.clipboard.writeText(data).then(() => {
            /* clipboard successfully set */
          }, () => {
            /* clipboard write failed */
            console.log('clipboard write failed')
          });
        }
      });

    } else {
      let blob;
      // SJIS対応はせず、ファイル拡張子でkif forシリーズに対応
      let bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      blob = new Blob([bom, data], { type: 'text/csv' });
      // ネイティブのencodeを有効にする場合はこちら
      // blob = new Blob([data], { type: 'text/csv' });

      let url = (window.URL || window.webkitURL).createObjectURL(blob);
      let link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    }
  }

  /***************************************************************
   * 対応済みサイトチェック
   * 将棋ウォーズ'https://shogiwars.heroz.jp/web_app/standard/'})
   * 将棋ウォーズ(Twitter Link) 'https://shogiwars.heroz.jp/games/'})
   * ピヨ将棋 'https://www.studiok-i.net/ps/'
   *************************************************************/
  let app = 'unknown';
  // IDで検索
  let apps = { sw: 'kifu_child', piyo: 'select_kifu' };
  for (let key in apps) {
    if (document.querySelectorAll('[id^=' + apps[key] + ']').length > 0) {
      console.log(key + 'として処理……');
      app = key;
      break;
    }
  }
  // classで検索
  if (document.querySelectorAll('[class^=Playback__kif___1evzo]').length > 0) {
    console.log('shogi warsのtwitter linkとして処理……');
    app = 'sw_link';
  }
  if (app == 'unknown') {
    alert('未対応のアプリケーションです。\n使い方を確認の上、再実行してください。');
    return false;
  }

  /***************************************
   * ヘッダーを出力
   *************************************/
  let records = []
  records.push('#KIF version=2.0 encoding=UTF-8');

  /***************************************
   * 手合割を指定
   *************************************/
  switch (app) {
    case 'sw':
      records.push('手合割：平手');
      break;

    case 'sw_link':
      records.push('手合割：平手');
      break;

    case 'piyo':
      if (document.getElementById('selectTeai').length == 0) {
        // 手合割が取得できない場合は平手をセット
        records.push('手合割：平手');
      } else {
        records.push('手合割：' + document.getElementById('selectTeai').value);
      }
      break;
  }
  records.push('下手：プレイヤー');
  records.push('上手：プレイヤー');
  records.push('手数----指手---------消費時間--');
  /***************************************
   * appごとに棋譜を読み込み
   *************************************/
  let filename;
  let kifu;
  let teban = '';
  let orig = '';
  let formatted = '';

  switch (app) {
    case 'sw':
      info = document.querySelectorAll('[id^=twitter-widget-]')[0].dataset.url;
      if (info) {
        // 将棋ウォーズとして処理
        filename = generate_filename(info.substring(info.lastIndexOf('/') + 1));
        kifu = document.querySelectorAll("#kifu_child span");
        kifu.forEach(function (te) {
          txt = te.innerHTML;
          console.log(txt);
          if (txt.length > 0) {
            teban = txt.match(/[0-9]+/);
            if (teban) {
              orig = txt.match(/(▲|△|☗|☖)[1-9][1-9].*/)[0];
              formatted = teban + ' ' + single_to_double(orig.substring(1, 2)) + int_to_kansuji(orig.substring(2, 3)) + orig.substring(3) + '   ( 0:00/00:00:00)'
              records.push(formatted);
            }
          }
        });
        export_to_file(records);
      }
      break;


    case 'sw_link':
      info = location.href;
      if (info) {
        // 将棋ウォーズとして処理
        filename = generate_filename(info.substring(info.lastIndexOf('/') + 1));
        kifu = document.querySelectorAll(".Playback__kif___1evzo option");
        kifu.forEach(function (te) {
          txt = te.innerHTML;
          if (txt.length > 0) {
            teban = txt.match(/[0-9]+/);
            if (teban) {
              orig = txt.match(/(▲|△)[1-9][1-9].*/)[0];
              formatted = teban + ' ' + single_to_double(orig.substring(1, 2)) + int_to_kansuji(orig.substring(2, 3)) + orig.substring(3) + '   ( 0:00/00:00:00)'
              records.push(formatted);
            }
          }
        });
        export_to_file(records);
      }
      break;

    case 'piyo':
      info = document.querySelectorAll('[id^=select_kifu]');
      if (info) {
        // ぴよ将棋として処理
        filename = generate_filename('piyo_' + replace_teai(document.getElementById('selectTeai').value) + '_' + format_timestamp());
        kifu = document.querySelectorAll("#select_kifu option");
        kifu.forEach(function (te) {
          txt = te.innerHTML;
          if (txt.length > 0) {
            teban = txt.match(/[0-9]+/);
            if (teban) {
              if (teban[0] != 0) {
                formatted = txt.replace('▲', '').replace('△', '').replace('杏', '成香').replace('全', '成銀').replace('圭', '成桂');
                records.push(formatted);
              }
            }
          }
        });
        export_to_file(records);
      }
      break;

    default:
      alert('何かがうまくいかなかったようです');
  }
};
