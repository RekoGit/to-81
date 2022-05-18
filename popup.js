/*
手合割
「平手」、「香落ち」、「右香落ち」、「角落ち」、「飛車落ち」、「飛香落ち」、「二枚落ち」、「三枚落ち」、「四枚落ち」、「五枚落ち」、「左五枚落ち」、「六枚落ち」、「左七枚落ち」、「右七枚落ち」、「八枚落ち」、「十枚落ち」、「その他」

<駒> 駒名
玉、飛、龍、角、馬、金、銀、成銀、桂、成桂、香、成香、歩、と
龍を「竜」であらわす場合もある。
成銀を「全」、成桂を「圭」、成香を「杏」であらわす場合もある（「詰将棋パラダイス」でも使用）。
*/
document.getElementById("btn").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: exportKIF,
  });
});

function exportKIF() {
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

  function output_utf8_sig(records) {
    let data = records.join('\r\n');
    let bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    let blob = new Blob([bom, data], { type: 'text/csv' });
    let url = (window.URL || window.webkitURL).createObjectURL(blob);
    let link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 対応済みサイトチェック
  // 将棋ウォーズ'https://shogiwars.heroz.jp/web_app/standard/'})
  // ピヨ将棋 'https://www.studiok-i.net/ps/'
  let app = 'unknown';
  let apps = { sw: 'kifu_child', piyo: 'select_kifu' };
  for (let key in apps) {
    if (document.querySelectorAll('[id^=' + apps[key] + ']').length > 0) {
      console.log(key + 'として処理……');
      app = key;
      break;
    }
  }
  if (app == 'unknown') {
    alert('未対応のアプリケーションです。\n実行方法を確認の上、再実行してください。');
    return false;
  }

  let filename;
  let records = [
    '#KIF version=2.0 encoding=UTF-8',
    '手合割：平手',
    '下手：プレイヤー',
    '上手：プレイヤー',
    '手数----指手---------消費時間--'
  ]
  let kifu;
  let teban = '';
  let orig = '';
  let formatted = '';
  switch (app) {
    case 'sw':
      info = document.querySelectorAll('[id^=twitter-widget-]')[0].dataset.url;
      if (info) {
        // 将棋ウォーズとして処理
        filename = info.substring(info.lastIndexOf('/') + 1) + '.kif';
        kifu = document.querySelectorAll("#kifu_child span");
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
        output_utf8_sig(records);
      }
      break;

    case 'piyo':
      info = document.querySelectorAll('[id^=select_kifu]');
      if (info) {
        // ぴよ将棋として処理
        filename = 'piyo' + format_timestamp() + '.kif';
        kifu = document.querySelectorAll("#select_kifu option");
        kifu.forEach(function (te) {
          txt = te.innerHTML;
          if (txt.length > 0) {
            teban = txt.match(/[0-9]+/);
            if (teban) {
              if (teban[0] != 0) {
                formatted = txt.replace('▲', '').replace('△', '').replace('杏', '成香');
                records.push(formatted);
              }
            }
          }
        });
        output_utf8_sig(records);
      }
      break;

    default:
      alert('何かがうまくいかなかったようです');
  }
};
