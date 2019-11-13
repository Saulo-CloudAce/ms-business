function validateKey (fields) {
  var keys = fields.filter(f => f.key)
  return keys.length > 0
}

function validateFields (fields) {
  return fields.map(f => {
    if (!f.key) f.key = false
    if (!f.required) f.required = false
    if (!f.editable) f.editable = false
    if (!f.operatorCanView) f.operator_can_view = true

    f.label = (f.label) ? f.label : f.column
    f.column = clearString(f.column.toLowerCase())

    if (f.type === 'array') {
      if (f.fields) {
        f.fields.map(ff => {
          if (!ff.key) ff.key = false
          if (!ff.required) ff.required = false
          if (!ff.editable) ff.editable = false
          if (!ff.operatorCanView) ff.operator_can_view = true

          ff.label = (ff.label) ? ff.label : ff.column
          ff.column = clearString(ff.column.toLowerCase())
        })
      }
    }

    return f
  })
}

function clearString (texto) {
  texto = texto.replace(/ /g, '_')
  var charMap = { 0: '0', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', H: 'H', I: 'I', J: 'J', K: 'K', L: 'L', M: 'M', N: 'N', O: 'O', P: 'P', Q: 'Q', R: 'R', S: 'S', T: 'T', U: 'U', V: 'V', W: 'W', X: 'X', Y: 'Y', Z: 'Z', a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', q: 'q', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', x: 'x', y: 'y', z: 'z', ª: 'a', '²': '2', '³': '3', '¹': '1', º: 'o', À: 'A', Á: 'A', Â: 'A', Ã: 'A', Ä: 'A', Å: 'A', Ç: 'C', È: 'E', É: 'E', Ê: 'E', Ë: 'E', Ì: 'I', Í: 'I', Î: 'I', Ï: 'I', Ð: 'D', Ñ: 'N', Ò: 'O', Ó: 'O', Ô: 'O', Õ: 'O', Ö: 'O', Ø: 'O', Ù: 'U', Ú: 'U', Û: 'U', Ü: 'U', Ý: 'Y', à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', ç: 'c', è: 'e', é: 'e', ê: 'e', ë: 'e', ì: 'i', í: 'i', î: 'i', ï: 'i', ð: 'd', ñ: 'n', ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o', ù: 'u', ú: 'u', û: 'u', ü: 'u', ý: 'y', ÿ: 'y', Ā: 'A', ā: 'a', Ă: 'A', ă: 'a', Ą: 'A', ą: 'a', Ć: 'C', ć: 'c', Ĉ: 'C', ĉ: 'c', Ċ: 'C', ċ: 'c', Č: 'C', č: 'c', Ď: 'D', ď: 'd', Đ: 'D', đ: 'd', Ē: 'E', ē: 'e', Ĕ: 'E', ĕ: 'e', Ė: 'E', ė: 'e', Ę: 'E', ę: 'e', Ě: 'E', ě: 'e', Ĝ: 'G', ĝ: 'g', Ğ: 'G', ğ: 'g', Ġ: 'G', ġ: 'g', Ģ: 'G', ģ: 'g', Ĥ: 'H', ĥ: 'h', Ħ: 'H', ħ: 'h', Ĩ: 'I', ĩ: 'i', Ī: 'I', ī: 'i', Ĭ: 'I', ĭ: 'i', Į: 'I', į: 'i', İ: 'I', Ĵ: 'J', ĵ: 'j', Ķ: 'K', ķ: 'k', Ĺ: 'L', ĺ: 'l', Ļ: 'L', ļ: 'l', Ľ: 'L', ľ: 'l', Ŀ: 'L', ŀ: 'l', Ł: 'L', ł: 'l', Ń: 'N', ń: 'n', Ņ: 'N', ņ: 'n', Ň: 'N', ň: 'n', Ō: 'O', ō: 'o', Ŏ: 'O', ŏ: 'o', Ő: 'O', ő: 'o', Ŕ: 'R', ŕ: 'r', Ŗ: 'R', ŗ: 'r', Ř: 'R', ř: 'r', Ś: 'S', ś: 's', Ŝ: 'S', ŝ: 's', Ş: 'S', ş: 's', Š: 'S', š: 's', Ţ: 'T', ţ: 't', Ť: 'T', ť: 't', Ũ: 'U', ũ: 'u', Ū: 'U', ū: 'u', Ŭ: 'U', ŭ: 'u', Ů: 'U', ů: 'u', Ű: 'U', ű: 'u', Ų: 'U', ų: 'u', Ŵ: 'W', ŵ: 'w', Ŷ: 'Y', ŷ: 'y', Ÿ: 'Y', Ź: 'Z', ź: 'z', Ż: 'Z', ż: 'z', Ž: 'Z', ž: 'z', ſ: 's', Ơ: 'O', ơ: 'o', Ư: 'U', ư: 'u', Ǎ: 'A', ǎ: 'a', Ǐ: 'I', ǐ: 'i', Ǒ: 'O', ǒ: 'o', Ǔ: 'U', ǔ: 'u', Ǖ: 'U', ǖ: 'u', Ǘ: 'U', ǘ: 'u', Ǚ: 'U', ǚ: 'u', Ǜ: 'U', ǜ: 'u', Ǟ: 'A', ǟ: 'a', Ǡ: 'A', ǡ: 'a', Ǧ: 'G', ǧ: 'g', Ǩ: 'K', ǩ: 'k', Ǫ: 'O', ǫ: 'o', Ǭ: 'O', ǭ: 'o', ǰ: 'j', Ǵ: 'G', ǵ: 'g', Ǹ: 'N', ǹ: 'n', Ǻ: 'A', ǻ: 'a', Ǿ: 'O', ǿ: 'o', Ȁ: 'A', ȁ: 'a', Ȃ: 'A', ȃ: 'a', Ȅ: 'E', ȅ: 'e', Ȇ: 'E', ȇ: 'e', Ȉ: 'I', ȉ: 'i', Ȋ: 'I', ȋ: 'i', Ȍ: 'O', ȍ: 'o', Ȏ: 'O', ȏ: 'o', Ȑ: 'R', ȑ: 'r', Ȓ: 'R', ȓ: 'r', Ȕ: 'U', ȕ: 'u', Ȗ: 'U', ȗ: 'u', Ș: 'S', ș: 's', Ț: 'T', ț: 't', Ȟ: 'H', ȟ: 'h', Ȧ: 'A', ȧ: 'a', Ȩ: 'E', ȩ: 'e', Ȫ: 'O', ȫ: 'o', Ȭ: 'O', ȭ: 'o', Ȯ: 'O', ȯ: 'o', Ȱ: 'O', ȱ: 'o', Ȳ: 'Y', ȳ: 'y', ʰ: 'h', ʲ: 'j', ʳ: 'r', ʷ: 'w', ʸ: 'y', ˡ: 'l', ˢ: 's', ˣ: 'x', 'ͣ': 'a', 'ͤ': 'e', 'ͥ': 'i', 'ͦ': 'o', 'ͧ': 'u', 'ͨ': 'c', 'ͩ': 'd', 'ͪ': 'h', 'ͫ': 'm', 'ͬ': 'r', 'ͭ': 't', 'ͮ': 'v', 'ͯ': 'x', '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9', '߀': '0', '߁': '1', '߂': '2', '߃': '3', '߄': '4', '߅': '5', '߆': '6', '߇': '7', '߈': '8', '߉': '9', '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9', '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9', '੦': '0', '੧': '1', '੨': '2', '੩': '3', '੪': '4', '੫': '5', '੬': '6', '੭': '7', '੮': '8', '੯': '9', '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9', '୦': '0', '୧': '1', '୨': '2', '୩': '3', '୪': '4', '୫': '5', '୬': '6', '୭': '7', '୮': '8', '୯': '9', '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4', '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9', '౦': '0', '౧': '1', '౨': '2', '౩': '3', '౪': '4', '౫': '5', '౬': '6', '౭': '7', '౮': '8', '౯': '9', '౸': '0', '౹': '1', '౺': '2', '౻': '3', '౼': '1', '౽': '2', '౾': '3', '೦': '0', '೧': '1', '೨': '2', '೩': '3', '೪': '4', '೫': '5', '೬': '6', '೭': '7', '೮': '8', '೯': '9', '൦': '0', '൧': '1', '൨': '2', '൩': '3', '൪': '4', '൫': '5', '൬': '6', '൭': '7', '൮': '8', '൯': '9', '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9', '໐': '0', '໑': '1', '໒': '2', '໓': '3', '໔': '4', '໕': '5', '໖': '6', '໗': '7', '໘': '8', '໙': '9', '༠': '0', '༡': '1', '༢': '2', '༣': '3', '༤': '4', '༥': '5', '༦': '6', '༧': '7', '༨': '8', '༩': '9', '༪': '1', '༫': '2', '༬': '3', '༭': '4', '༮': '5', '༯': '6', '༰': '7', '༱': '8', '༲': '9', '༳': '0', '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4', '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9', '႐': '0', '႑': '1', '႒': '2', '႓': '3', '႔': '4', '႕': '5', '႖': '6', '႗': '7', '႘': '8', '႙': '9', '፩': '1', '፪': '2', '፫': '3', '፬': '4', '፭': '5', '፮': '6', '፯': '7', '፰': '8', '፱': '9', '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4', '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9', '៰': '0', '៱': '1', '៲': '2', '៳': '3', '៴': '4', '៵': '5', '៶': '6', '៷': '7', '៸': '8', '៹': '9', '᠐': '0', '᠑': '1', '᠒': '2', '᠓': '3', '᠔': '4', '᠕': '5', '᠖': '6', '᠗': '7', '᠘': '8', '᠙': '9', '᥆': '0', '᥇': '1', '᥈': '2', '᥉': '3', '᥊': '4', '᥋': '5', '᥌': '6', '᥍': '7', '᥎': '8', '᥏': '9', '᧐': '0', '᧑': '1', '᧒': '2', '᧓': '3', '᧔': '4', '᧕': '5', '᧖': '6', '᧗': '7', '᧘': '8', '᧙': '9', '᧚': '1', '᪀': '0', '᪁': '1', '᪂': '2', '᪃': '3', '᪄': '4', '᪅': '5', '᪆': '6', '᪇': '7', '᪈': '8', '᪉': '9', '᪐': '0', '᪑': '1', '᪒': '2', '᪓': '3', '᪔': '4', '᪕': '5', '᪖': '6', '᪗': '7', '᪘': '8', '᪙': '9', '᭐': '0', '᭑': '1', '᭒': '2', '᭓': '3', '᭔': '4', '᭕': '5', '᭖': '6', '᭗': '7', '᭘': '8', '᭙': '9', '᮰': '0', '᮱': '1', '᮲': '2', '᮳': '3', '᮴': '4', '᮵': '5', '᮶': '6', '᮷': '7', '᮸': '8', '᮹': '9', '᱀': '0', '᱁': '1', '᱂': '2', '᱃': '3', '᱄': '4', '᱅': '5', '᱆': '6', '᱇': '7', '᱈': '8', '᱉': '9', '᱐': '0', '᱑': '1', '᱒': '2', '᱓': '3', '᱔': '4', '᱕': '5', '᱖': '6', '᱗': '7', '᱘': '8', '᱙': '9', ᴬ: 'A', ᴮ: 'B', ᴰ: 'D', ᴱ: 'E', ᴳ: 'G', ᴴ: 'H', ᴵ: 'I', ᴶ: 'J', ᴷ: 'K', ᴸ: 'L', ᴹ: 'M', ᴺ: 'N', ᴼ: 'O', ᴾ: 'P', ᴿ: 'R', ᵀ: 'T', ᵁ: 'U', ᵂ: 'W', ᵃ: 'a', ᵇ: 'b', ᵈ: 'd', ᵉ: 'e', ᵍ: 'g', ᵏ: 'k', ᵐ: 'm', ᵒ: 'o', ᵖ: 'p', ᵗ: 't', ᵘ: 'u', ᵛ: 'v', ᵢ: 'i', ᵣ: 'r', ᵤ: 'u', ᵥ: 'v', ᵹ: 'g', ᶜ: 'c', ᶞ: 'd', ᶠ: 'f', ᶻ: 'z', '᷊': 'r', 'ᷓ': 'a', 'ᷗ': 'c', 'ᷘ': 'd', 'ᷙ': 'd', 'ᷚ': 'g', 'ᷜ': 'k', 'ᷝ': 'l', 'ᷠ': 'n', 'ᷤ': 's', 'ᷥ': 's', 'ᷦ': 'z', Ḁ: 'A', ḁ: 'a', Ḃ: 'B', ḃ: 'b', Ḅ: 'B', ḅ: 'b', Ḇ: 'B', ḇ: 'b', Ḉ: 'C', ḉ: 'c', Ḋ: 'D', ḋ: 'd', Ḍ: 'D', ḍ: 'd', Ḏ: 'D', ḏ: 'd', Ḑ: 'D', ḑ: 'd', Ḓ: 'D', ḓ: 'd', Ḕ: 'E', ḕ: 'e', Ḗ: 'E', ḗ: 'e', Ḙ: 'E', ḙ: 'e', Ḛ: 'E', ḛ: 'e', Ḝ: 'E', ḝ: 'e', Ḟ: 'F', ḟ: 'f', Ḡ: 'G', ḡ: 'g', Ḣ: 'H', ḣ: 'h', Ḥ: 'H', ḥ: 'h', Ḧ: 'H', ḧ: 'h', Ḩ: 'H', ḩ: 'h', Ḫ: 'H', ḫ: 'h', Ḭ: 'I', ḭ: 'i', Ḯ: 'I', ḯ: 'i', Ḱ: 'K', ḱ: 'k', Ḳ: 'K', ḳ: 'k', Ḵ: 'K', ḵ: 'k', Ḷ: 'L', ḷ: 'l', Ḹ: 'L', ḹ: 'l', Ḻ: 'L', ḻ: 'l', Ḽ: 'L', ḽ: 'l', Ḿ: 'M', ḿ: 'm', Ṁ: 'M', ṁ: 'm', Ṃ: 'M', ṃ: 'm', Ṅ: 'N', ṅ: 'n', Ṇ: 'N', ṇ: 'n', Ṉ: 'N', ṉ: 'n', Ṋ: 'N', ṋ: 'n', Ṍ: 'O', ṍ: 'o', Ṏ: 'O', ṏ: 'o', Ṑ: 'O', ṑ: 'o', Ṓ: 'O', ṓ: 'o', Ṕ: 'P', ṕ: 'p', Ṗ: 'P', ṗ: 'p', Ṙ: 'R', ṙ: 'r', Ṛ: 'R', ṛ: 'r', Ṝ: 'R', ṝ: 'r', Ṟ: 'R', ṟ: 'r', Ṡ: 'S', ṡ: 's', Ṣ: 'S', ṣ: 's', Ṥ: 'S', ṥ: 's', Ṧ: 'S', ṧ: 's', Ṩ: 'S', ṩ: 's', Ṫ: 'T', ṫ: 't', Ṭ: 'T', ṭ: 't', Ṯ: 'T', ṯ: 't', Ṱ: 'T', ṱ: 't', Ṳ: 'U', ṳ: 'u', Ṵ: 'U', ṵ: 'u', Ṷ: 'U', ṷ: 'u', Ṹ: 'U', ṹ: 'u', Ṻ: 'U', ṻ: 'u', Ṽ: 'V', ṽ: 'v', Ṿ: 'V', ṿ: 'v', Ẁ: 'W', ẁ: 'w', Ẃ: 'W', ẃ: 'w', Ẅ: 'W', ẅ: 'w', Ẇ: 'W', ẇ: 'w', Ẉ: 'W', ẉ: 'w', Ẋ: 'X', ẋ: 'x', Ẍ: 'X', ẍ: 'x', Ẏ: 'Y', ẏ: 'y', Ẑ: 'Z', ẑ: 'z', Ẓ: 'Z', ẓ: 'z', Ẕ: 'Z', ẕ: 'z', ẖ: 'h', ẗ: 't', ẘ: 'w', ẙ: 'y', ẛ: 's', Ạ: 'A', ạ: 'a', Ả: 'A', ả: 'a', Ấ: 'A', ấ: 'a', Ầ: 'A', ầ: 'a', Ẩ: 'A', ẩ: 'a', Ẫ: 'A', ẫ: 'a', Ậ: 'A', ậ: 'a', Ắ: 'A', ắ: 'a', Ằ: 'A', ằ: 'a', Ẳ: 'A', ẳ: 'a', Ẵ: 'A', ẵ: 'a', Ặ: 'A', ặ: 'a', Ẹ: 'E', ẹ: 'e', Ẻ: 'E', ẻ: 'e', Ẽ: 'E', ẽ: 'e', Ế: 'E', ế: 'e', Ề: 'E', ề: 'e', Ể: 'E', ể: 'e', Ễ: 'E', ễ: 'e', Ệ: 'E', ệ: 'e', Ỉ: 'I', ỉ: 'i', Ị: 'I', ị: 'i', Ọ: 'O', ọ: 'o', Ỏ: 'O', ỏ: 'o', Ố: 'O', ố: 'o', Ồ: 'O', ồ: 'o', Ổ: 'O', ổ: 'o', Ỗ: 'O', ỗ: 'o', Ộ: 'O', ộ: 'o', Ớ: 'O', ớ: 'o', Ờ: 'O', ờ: 'o', Ở: 'O', ở: 'o', Ỡ: 'O', ỡ: 'o', Ợ: 'O', ợ: 'o', Ụ: 'U', ụ: 'u', Ủ: 'U', ủ: 'u', Ứ: 'U', ứ: 'u', Ừ: 'U', ừ: 'u', Ử: 'U', ử: 'u', Ữ: 'U', ữ: 'u', Ự: 'U', ự: 'u', Ỳ: 'Y', ỳ: 'y', Ỵ: 'Y', ỵ: 'y', Ỷ: 'Y', ỷ: 'y', Ỹ: 'Y', ỹ: 'y', '⁰': '0', ⁱ: 'i', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', ⁿ: 'n', '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', ₐ: 'a', ₑ: 'e', ₒ: 'o', ₓ: 'x', ₕ: 'h', ₖ: 'k', ₗ: 'l', ₘ: 'm', ₙ: 'n', ₚ: 'p', ₛ: 's', ₜ: 't', ℂ: 'C', ℊ: 'g', ℋ: 'H', ℌ: 'H', ℍ: 'H', ℎ: 'h', ℏ: 'h', ℐ: 'I', ℑ: 'I', ℒ: 'L', ℓ: 'l', ℕ: 'N', ℙ: 'P', ℚ: 'Q', ℛ: 'R', ℜ: 'R', ℝ: 'R', ℤ: 'Z', ℨ: 'Z', K: 'K', Å: 'A', ℬ: 'B', ℭ: 'C', ℯ: 'e', ℰ: 'E', ℱ: 'F', ℳ: 'M', ℴ: 'o', ℹ: 'i', ⅅ: 'D', ⅆ: 'd', ⅇ: 'e', ⅈ: 'i', ⅉ: 'j', Ⅰ: 'I', Ⅴ: 'V', Ⅹ: 'X', Ⅼ: 'L', Ⅽ: 'C', Ⅾ: 'D', Ⅿ: 'M', ⅰ: 'i', ⅴ: 'v', ⅹ: 'x', ⅼ: 'l', ⅽ: 'c', ⅾ: 'd', ⅿ: 'm', ↅ: '6', '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', 'Ⓐ': 'A', 'Ⓑ': 'B', 'Ⓒ': 'C', 'Ⓓ': 'D', 'Ⓔ': 'E', 'Ⓕ': 'F', 'Ⓖ': 'G', 'Ⓗ': 'H', 'Ⓘ': 'I', 'Ⓙ': 'J', 'Ⓚ': 'K', 'Ⓛ': 'L', 'Ⓜ': 'M', 'Ⓝ': 'N', 'Ⓞ': 'O', 'Ⓟ': 'P', 'Ⓠ': 'Q', 'Ⓡ': 'R', 'Ⓢ': 'S', 'Ⓣ': 'T', 'Ⓤ': 'U', 'Ⓥ': 'V', 'Ⓦ': 'W', 'Ⓧ': 'X', 'Ⓨ': 'Y', 'Ⓩ': 'Z', 'ⓐ': 'a', 'ⓑ': 'b', 'ⓒ': 'c', 'ⓓ': 'd', 'ⓔ': 'e', 'ⓕ': 'f', 'ⓖ': 'g', 'ⓗ': 'h', 'ⓘ': 'i', 'ⓙ': 'j', 'ⓚ': 'k', 'ⓛ': 'l', 'ⓜ': 'm', 'ⓝ': 'n', 'ⓞ': 'o', 'ⓟ': 'p', 'ⓠ': 'q', 'ⓡ': 'r', 'ⓢ': 's', 'ⓣ': 't', 'ⓤ': 'u', 'ⓥ': 'v', 'ⓦ': 'w', 'ⓧ': 'x', 'ⓨ': 'y', 'ⓩ': 'z', '⓪': '0', '⓵': '1', '⓶': '2', '⓷': '3', '⓸': '4', '⓹': '5', '⓺': '6', '⓻': '7', '⓼': '8', '⓽': '9', '⓿': '0', '❶': '1', '❷': '2', '❸': '3', '❹': '4', '❺': '5', '❻': '6', '❼': '7', '❽': '8', '❾': '9', '➀': '1', '➁': '2', '➂': '3', '➃': '4', '➄': '5', '➅': '6', '➆': '7', '➇': '8', '➈': '9', '➊': '1', '➋': '2', '➌': '3', '➍': '4', '➎': '5', '➏': '6', '➐': '7', '➑': '8', '➒': '9', ⱼ: 'j', ⱽ: 'V', 〇: '0', 〡: '1', 〢: '2', 〣: '3', 〤: '4', 〥: '5', 〦: '6', 〧: '7', 〨: '8', 〩: '9', '꘠': '0', '꘡': '1', '꘢': '2', '꘣': '3', '꘤': '4', '꘥': '5', '꘦': '6', '꘧': '7', '꘨': '8', '꘩': '9', Ꝺ: 'D', ꝺ: 'd', Ꝼ: 'F', ꝼ: 'f', Ᵹ: 'G', Ꞃ: 'R', ꞃ: 'r', Ꞅ: 'S', ꞅ: 's', Ꞇ: 'T', ꞇ: 't', Ꞡ: 'G', ꞡ: 'g', Ꞣ: 'K', ꞣ: 'k', Ꞥ: 'N', ꞥ: 'n', Ꞧ: 'R', ꞧ: 'r', Ꞩ: 'S', ꞩ: 's', '꣐': '0', '꣑': '1', '꣒': '2', '꣓': '3', '꣔': '4', '꣕': '5', '꣖': '6', '꣗': '7', '꣘': '8', '꣙': '9', '꤀': '0', '꤁': '1', '꤂': '2', '꤃': '3', '꤄': '4', '꤅': '5', '꤆': '6', '꤇': '7', '꤈': '8', '꤉': '9', '꧐': '0', '꧑': '1', '꧒': '2', '꧓': '3', '꧔': '4', '꧕': '5', '꧖': '6', '꧗': '7', '꧘': '8', '꧙': '9', '꩐': '0', '꩑': '1', '꩒': '2', '꩓': '3', '꩔': '4', '꩕': '5', '꩖': '6', '꩗': '7', '꩘': '8', '꩙': '9', '꯰': '0', '꯱': '1', '꯲': '2', '꯳': '3', '꯴': '4', '꯵': '5', '꯶': '6', '꯷': '7', '꯸': '8', '꯹': '9', '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9', Ａ: 'A', Ｂ: 'B', Ｃ: 'C', Ｄ: 'D', Ｅ: 'E', Ｆ: 'F', Ｇ: 'G', Ｈ: 'H', Ｉ: 'I', Ｊ: 'J', Ｋ: 'K', Ｌ: 'L', Ｍ: 'M', Ｎ: 'N', Ｏ: 'O', Ｐ: 'P', Ｑ: 'Q', Ｒ: 'R', Ｓ: 'S', Ｔ: 'T', Ｕ: 'U', Ｖ: 'V', Ｗ: 'W', Ｘ: 'X', Ｙ: 'Y', Ｚ: 'Z', ａ: 'a', ｂ: 'b', ｃ: 'c', ｄ: 'd', ｅ: 'e', ｆ: 'f', ｇ: 'g', ｈ: 'h', ｉ: 'i', ｊ: 'j', ｋ: 'k', ｌ: 'l', ｍ: 'm', ｎ: 'n', ｏ: 'o', ｐ: 'p', ｑ: 'q', ｒ: 'r', ｓ: 's', ｔ: 't', ｕ: 'u', ｖ: 'v', ｗ: 'w', ｘ: 'x', ｙ: 'y', ｚ: 'z' }

  var er = /\W/gi
  texto = texto.replace(er, function (match) {
    var base = charMap[match]
    base = !base || er.test(base) ? match : base
    return base
  })
  return texto
}

module.exports = { validateFields, validateKey }
