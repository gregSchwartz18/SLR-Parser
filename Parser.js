var global_out = "";

var signals = ["See also", "see also", "See generally", "see generally", "but see", "But see", "see e.g.,", "See e.g.,", "see, e.g.,", "See, e.g.,", "E.g.,", "e.g.,", "E.g.", "e.g.",  "See", "see"]; // subsignals, like "see", need to be later on list

var courts = ["Cir."];

// Identifiers. There should only be one of these per citation
var reporters = ["F. App’x", "S. Ct.", "L. Ed.", "F.3d", "F. Supp."];
var journal_identifiers = ["L. Rev.", "L. REV.", "L.J."];
var statue_identifiers = ["U.S.C.", "U.S. CONST"];
var book_identifiers = ["d ed."];

/**
 * Parse cells containing footnotes into SP/R1/R2/Galley Spreadsheets.
 * @param {string} action The action to take. Either "SP", "R1", or "R2/Galley".
 * @param {Array<String>} fns A 1-D range of cells containing footnotes.
 * @param {Integer} fnStart [OPTIONAL] The first footnote number. Default is "1".
 * @param {Array<String>} old_fns [OPTIONAL] A 1-D range of cells containing footnotes.
 * @param {Array<String>} source_ID [OPTIONAL] A 1-D range of cells containing the source ID #s.
 * @param {Array<String>} source_citation [OPTIONAL] A 1-D range of cells containing the sources original citations.
 * @return Structured data parsed from the footnotes.
 * @customfunction
 */
function Auto_Filler(action, fns, fnStart, old_fns, source_ID, source_citation) {
  output = "";
  input = "";
  old_input = "";
  sourcesPulled = [];

  if (fnStart === ''){
    fnStart = 1;
  }

  for (var i = 0; i < fns.length; i++) {
    input = input+fns[i];
  }
  input = input.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"); // replace curly quotes

  for (var i = 0; i < old_fns.length; i++) {
    old_input = old_input+"\n"+old_fns[i];
  }
  old_input = old_input.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"); // replace curly quotes

  for (var i = 0; i < source_ID.length; i++) {
    sourcesPulled[i] = [];
    sourcesPulled[i][0] = source_ID[i]+"";
    sourcesPulled[i][1] = source_citation[i]+"";
  }

  // info: [fn #, cite #, cite]
  info = populate(input, fnStart, sourcesPulled);

  //if (fct == "Source ID") {
  //  output = SourceID(input);
  //}

  if (action == "SP") {
    //removeDuplicates(info);
    output = info.map(row => { return [row[7], row[3], row[0], row[2], row[4], row[5]]})
    output.unshift([""]); // accounts for merged cells
    output.unshift(["Ai", "Suggested\nShort Name", "Footnote # (first mention)", "Full Source Citation", "Type of Source", "Duplicate?"]);
    output.unshift(["Sourcepull"]);
  }

  if (action == "R1") {
    output = info.map(row => { return [row[6], row[0], row[1], row[2], " "]})
    output.unshift([""]);
    output.unshift(["Source ID #\n(3 digit)", "FN #\n(3 digit)", "Cite #\n(2 digit)", "Citation"]);
    output.unshift(["Round 1"]);
  }

  if (action == "R2/Galley") {
    old_info = populate(old_input, fnStart, sourcesPulled);
    match_rounds(info, old_info);

    output = info.map(row => { return [row[6], row[0], row[1], row[2], " "]})
    output.unshift([""]);
    output.unshift(["Old FN#\n(3 digit)", "FN #\n(3 digit)", "Cite #\n(2 digit)", "Citation"]);
    output.unshift(["Round 2/Galley"]);
  }

  if (global_out == ""){
    return output;
  }else{
    return global_out;
  }
}

function match_rounds(input, old_input){
  for (var i = 0; i < input.length; i++) {
    input[i][6] = "";
    for (var e = 0; e < old_input.length; e++) {
      if (old_input[e][2] === input[i][2]){
        if (input[i][6] === ""){ // set if empty
          input[i][6] = old_input[e][0];
        }else if (input[i][6] !== " "){ // stay silent if multiple guesses
          input[i][6] = " ";
        }
      }
    }
  }
}

function removeDuplicates(input){
  output = input;
  cross_refs = ["Id.", "id.", "Supra", "supra", "Infra", "infra"];

  for (var i = 0; i < output.length; i++) {
    for (var e = 0; e < cross_refs.length; e++) {
      if (output[i][2].includes(cross_refs[e])) {
        output.splice(i,1);
        i=0
      }
    }
  }
  return output;
}

function populate(input, fnStart, sourcesPulled) {

  output = getFootnotes(input, fnStart);
  ouput = separateCites(output); // [fn #, cite #, cite]
  ouput = add_TypeOfSource(output); // [fn #, cite #, cite, "", type]
  ouput = highlightDuplicates(output); // [fn #, cite #, cite, "", type, duplicate?]
  ouput = add_SourceID(output, sourcesPulled); // [fn #, cite #, cite, "", type, duplicate?, sourceID]
  ouput = add_Shortname(output); // [fn #, cite #, cite, shortname, type, duplicate?, sourceID]
  ouput = add_AiNum(output, fnStart);

  return output;
}

function add_AiNum(input, fnStart) {
  for (var i = 0; i < input.length; i++) {
    var str_i  = (i+1).toString();
    while (3 > str_i.length){
      str_i = "0" + str_i;
    }
    input[i][7] = str_i;
  } 
    
  return input;
}

function add_SourceID(input, sourcesPulled) {

  for (var i = 0; i < input.length; i++) {
    input[i][6] = "";
    for (var e = 0; e < sourcesPulled.length; e++) {
      formatted_cite = input[i][2].toUpperCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
      formatted_source = sourcesPulled[e][1].toUpperCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
      if ((formatted_cite.includes(formatted_source) || formatted_source.includes(formatted_cite)) && sourcesPulled[e][1]) { // if full cite is present and nonempty
        input[i][6] = sourcesPulled[e][0];
      }
    }
  }

  for (var i = 0; i < input.length; i++) {
    if (input[i][6] === ""){
      cite = input[i][2];
      for (var e = 0; e < signals.length; e++) {
        cite = cite.replace((signals[e]+" "),'');
      }

      cite = cite.split(" ");
      for (var e = 0; e < cite.length; e++) {
        if (cite[e] === "Supra" || cite[e] === "supra" || cite[e] === "Infra" || cite[e] === "infra") {
          fn = cite[e+2].replace(",", "");
          if (fn.includes("-")) {
            input[i][6] = "nn."+fn;
            break;
          }

          author = "";
          for (var k = input.length - 1; k >= 0; k--){ // traverse in reverse to determine if multiple cites in fn

            if (parseInt(input[k][0]) == fn) {
              if (input[k][1] == "01" && author === "") { // check if only one cite in fn
                input[i][6] = input[k][6];
              }else{
                author = " ";
                if (e > 0){
                  author = cite[e-1].slice(0, -1);
                  if (input[k][2].includes(author)){
                    input[i][6] = input[k][6];
                  }
                }else{
                  input[i][6] = "n."+fn;
                }
              }
            }
          }
        }
      }
    }
  }

  for (var i = 0; i < input.length; i++) {
    if (input[i][2].includes("[hereinafter")){
      var term = input[i][2].split("hereinafter")[1].split("]")[0];

      // Remove leading whitespace
      while(term[0]==" "){
        term = term.slice(1);
      }
      // Trailing leading whitespace
      while(term.charAt(term.length-1)==" "){
        term = term.slice(0, -1);
      }

      //global_out = global_out + " " + term;
      for (var e = i+1; e < input.length; e++) {
        //if (term.includes("Post-AIA § 102")) {
        //  global_out = term;
        //}
        if (input[e][2].includes(term)) {
          input[e][6] = input[i][6];
        }
      }
    }
  }

  for (var i = 0; i < input.length; i++) {
    for (var e = 0; e < reporters.length; e++) {
      if (input[i][6] !== "" && input[i][2].includes(reporters[e])){
        cite = input[i][2].split(reporters[e])[0].split(" ");
        volume = cite[cite.length-2];
        term = volume + " " + reporters[e]; // e.g. "95 S. Ct."

        for (var j = 0; j < input.length; j++) {
          if (input[j][2].includes(term)){
            input[j][6] = input[i][6];
          }
        }
      }
    }
  }

  for (var i = 0; i < input.length; i++) {
    if (input[i][6] === ""){
      if (input[i][2].includes("Id.") || input[i][2].includes("id.")){
        input[i][6] = input[i-1][6];
      }
    }
  }

  return input;
}

function highlightDuplicates(input) {
  output = handleHereinafter(input);
  output = handleCaseNames(output);
  output = handlereporterVol(output);
  
  cross_refs = ["Id.", "id.", "Supra", "supra", "Infra", "infra"];

  for (var i = 0; i < output.length; i++) {
    for (var e = 0; e < cross_refs.length; e++) {
      if (output[i][2].includes(cross_refs[e])) {
        output[i][5] = 'CHECK: includes "' +cross_refs[e]+'"';
      }
    }
  }
  return output;
}

function handlereporterVol(input) {
  for (var i = 0; i < input.length; i++) {
    for (var e = 0; e < reporters.length; e++) {
      if (input[i][2].includes(reporters[e])){
        cite = input[i][2].split(reporters[e])[0].split(" ");
        volume = cite[cite.length-2];
        term = volume + " " + reporters[e]; // e.g. "95 S. Ct."

        for (var j = i+1; j < input.length; j++) {
          if (input[j][2].includes(term) && !input[j][5]){
            input[j][5] = "CHECK: " +term+" from n."+input[i][0]+"."+input[i][1];
          }
        }
      }
    }
  }
  return input;
}

function handleHereinafter(input) {
  for (var i = 0; i < input.length; i++) {
    if (input[i][2].includes("[hereinafter")){
      var term = input[i][2].split("hereinafter")[1].split("]")[0];

      // Remove leading whitespace
      while(term[0]==" "){
        term = term.slice(1);
      }
      // Trailing leading whitespace
      while(term.charAt(term.length-1)==" "){
        term = term.slice(0, -1);
      }

      //global_out = global_out + " " + term;
      for (var e = i+1; e < input.length; e++) {
        //if (term.includes("Post-AIA § 102")) {
        //  global_out = term;
        //}
        if (input[e][2].includes(term)) {
          input[e][5] = 'CHECK: "' +term+'" is hereinafter\'d at n.'+ input[i][0]+"."+input[i][1];
        }
      }
    }
  }
  return input;
}

function handleCaseNames(input) {
  for (var i = 0; i < input.length; i++) {
    if (input[i][2].includes(" v. ")){
      var term = input[i][2].split("v.")[0];

      // Remove signals
      for (var e = 0; e < signals.length; e++) {
        term=term.replace(signals[e], "");
      }
      // Remove leading whitespace
      while(term[0]==" "){
        term = term.slice(1);
      }
      // Trailing leading whitespace
      while(term.charAt(term.length-1)==" "){
        term = term.slice(0, -1);
      }

      //global_out = global_out + " " + term;
      for (var e = i+1; e < input.length; e++) {
        if (input[e][2].includes(term) && !input[e][5]) {
          input[e][5] = "CHECK: "+term+" from n."+input[i][0]+"."+input[i][1];
        }
      }
    }
  }
  return input;
}

function add_Shortname(input) {
  for (var i = 0; i < input.length; i++) {
    cite = input[i][2];
    for (var e = 0; e < signals.length; e++) {
      cite = cite.replace((signals[e]+" "),'');
    }

    if (cite.includes(" v. ")) {
      caseName = cite.split(",");
      if (caseName[1] && caseName[1].substring(0,6) === " Inc. ") { // one party is "X, Inc."
        if (caseName[2] && (caseName[2].substring(0,6) === " Inc.")){ // two parties are "X, Inc."
          input[i][3] = caseName[0]+","+caseName[1]+","+caseName[2];
        }else{
          input[i][3] = caseName[0]+","+caseName[1];
        }
      }else{
        input[i][3] = cite.slice(0, cite.indexOf(",")).substring(0,30);
      }
    
      /*var words = input[i][4].split(" ");
      var ind = words.indexOf("v.");
      input[i][1] = words[ind-1] + " " + words[ind] + " " + words[ind+1];*/
    }else{
      input[i][3] = cite.split(",")[0].split("(")[0].split("[")[0].toProperCase().replace(/\b\w/g, l => l.toUpperCase()).replace("§", "sec").replace("Notes ", "nn.").replace("Note ","n.").replace("Supra ", "").replace("supra ", "").replace("Infra ", "").replace("infra ", "").replace("And Accompanying Text.", "").substring(0,30);
    }
  }

  // redo to fix infra/supra (these should all be deleted anyway)
  cross_refs = ["Supra", "supra", "Infra", "infra"];
  for (var i = 0; i < input.length; i++) {
    cite = input[i][2];
    for (var e = 0; e < cross_refs.length; e++) {
      if (cite.includes(cross_refs[e])){
        cite_array = cite.split(" ");
        ref_Num = cite_array[cite_array.indexOf(cross_refs[e])+2].replace(",","");
        if (!isNaN(ref_Num)){ // check if referenced fn is a number
          input[i][3] = "n."+ ref_Num;
        }
      }else if (cite.includes(" id.") || cite.includes("Id.")) {
        if (input[i-1][2].includes(" id.") || input[i-1][2].includes("Id.")){
          input[i][3] = input[i-1][3];
        }else{
          input[i][3] = "n."+parseInt(input[i-1][0]);
        }
      }
    }
  }
  return input;
}
// reporters, journal_identifiers, statue_identifiers, book_identifiers
function add_TypeOfSource(input) {
  for (var i = 0; i < input.length; i++) {
    input[i][4] = " ";
    cases = reporters.concat(courts);
    for (var e = 0; e < cases.length; e++) {
      if (input[i][2].includes(cases[e]) || input[i][2].includes(" v. ") || input[i][2].includes("-cv-")){
        input[i][4] = "Case";
      }
    }
    for (var e = 0; e < journal_identifiers.length; e++) {
      if (input[i][2].includes(journal_identifiers[e])){
        input[i][4] = "Article";
      }
    }
    for (var e = 0; e < statue_identifiers.length; e++) {
      if (input[i][2].includes(statue_identifiers[e])){
        input[i][4] = "Statute";
      }
    }
    for (var e = 0; e < book_identifiers.length; e++) {
      if (input[i][2].includes(book_identifiers[e])){
        input[i][4] = "Book";
      }
    } 
    if (input[i][2].includes("https://")){
        input[i][4] = "Website";
    }
  
  }
  return input;
}

function getFootnotes(input, fnStart){
  // Input: Raw footnotes as string
  // Output: Array [footnote number, footnote]

  // Split by newline
  var output = input.split("\n");

  // Remove leading white space
  for (var i = 0; i < output.length; i++) {
    while(output[i][0]===" " || output[i][0]==="\n"){
      output[i] = output[i].slice(1);
    }
  }

  // Remove empty entries
  for (var i = 0; i < output.length; i++) {
    if (!output[i]) {
      output.splice(i,1);
      i=0
    }
  }

  // Add number column to array
  for (var i = 0; i < output.length; i++) {
    var str_i  = (i+fnStart).toString();
    while (3 > str_i.length){
      str_i = "0" + str_i;
    }
    output[i] = [str_i, output[i]]
  } 

  return output;
}

function separateCites(input){
  // input: [footnote #, footnote]
  // output: [footnote #, cite #, cite]

  // Add Cite # column 
  for (var i = 0; i < input.length; i++) {
    input[i][2] = input[i][1];
    input[i][1] = "01";
  }

  // Easy Rules
  output = citeSplitter(input, ";");
  output = citeSplitter(output, "Quoting");
  output = citeSplitter(output, "quoting");
  output = citeSplitter(output, "Citing");
  output = citeSplitter(output, "citing");

  // Split ". For" + minimum two words + ", [signal]"
  output = minutiaSplitter1(output);
  
  // Split [cite indicator] + ". [signal]" OR [cite indicator] + ", [signal]"
  output = minutiaSplitter2(output);

  // Split "Compare . . . with"
  output = minutiaSplitter3(output);

  // Split ". Id."
  output = minutiaSplitter4(output, ". Id.");
  output = minutiaSplitter4(output, '." Id.');

  // TODO Split "Id." w/o following "at/§/¶"

  // TODO: if multiple dates "(*yyy*)", split on end of first date multiple identifiers ORsplit

  // TODO: if multiple identifiers ORsplit

  output = numberCites(output);

  return output;
}

function citeSplitter(input, delimiter) {
  output = input;
  
  for (var i = 0; i < input.length; i++) {
    footnote = input[i][2];
    if (footnote.includes(delimiter)){
      cites = footnote.split(delimiter);
      
      for (var e = 0; e < cites.length; e++) {
        output.splice(i+e+1, 0, [input[i][0], "01", cites[e]]);
      }

      output.splice(i, 1);
    }
  }
  return output;
}

function minutiaSplitter1(input){
  // Split ". For"+ . . . +", [signal]"
  for (var i = 0; i < input.length; i++) {
    footnote = input[i][2];
    if (footnote.includes(". For")) {

      start = footnote.indexOf(". For")+1;
      after = footnote.split(". For")[1];
      immediatelyAfter = after.split(".")[0]; // Exclude intervening periods
        
      for (var e = 0; e < signals.length; e++) {
        if (immediatelyAfter.includes(", "+signals[e])){
          // Add split footnote to output
          first_Half = footnote.substring(0, start);
          second_Half = footnote.substring(start);

          input.splice(i+1, 0, [input[i][0], "01", first_Half]);
          input.splice(i+2, 0, [input[i][0], "01", second_Half]);

          input.splice(i, 1);
          i=i-1;
          break;
        }
      }
    }
  }

  return input;
}

function minutiaSplitter2(input){
  // Split [cite indicator] + ". [signal]"
  output = input;

  for (var e = 0; e < output.length; e++) {
    footnote = output[e][2];
    
    for (var i = 0; i < signals.length; i++) {
      delimiter = ". "+signals[i];
      delimiter2 = ", "+signals[i];

      if (footnote.includes(delimiter) || footnote.includes(delimiter2)){
        if (footnote.includes(delimiter)){
          index = footnote.indexOf(delimiter)+1;
        }else{
          index = footnote.indexOf(delimiter2)+1;
        }
        
        first_Half = footnote.substring(0, index);
        second_Half = footnote.substring(index);

        if (containsIndicator(first_Half)) {
          output.splice(e+1, 0, [output[e][0], "01", first_Half]);
          output.splice(e+2, 0, [output[e][0], "01", second_Half]);

          output.splice(e, 1);
          e=e-1
          
          break;
        }
      }
    }
  }
  return output;
}

function minutiaSplitter3(input){
  // Split "Compare . . . with"
  output = input;

  for (var i = 0; i < output.length; i++) {
    footnote = output[i][2];
    if (footnote.includes("with")){
      index = footnote.indexOf("with");
      first_Half = footnote.substring(0, index);
      second_Half = footnote.substring(index);

      if (first_Half.includes("Compare") && containsIndicator(first_Half) && containsIndicator(second_Half)){
          output.splice(i+1, 0, [output[i][0], "01", first_Half]);
          output.splice(i+2, 0, [output[i][0], "01", second_Half]);

          output.splice(i, 1);
          i=i-1

          break;
      }
    }

  }
return output;
}

function minutiaSplitter4(input, delimiter){
  // Split delimiter
  output = input;

  for (var i = 0; i < output.length; i++) {
    footnote = output[i][2];
    if (footnote.includes(delimiter)){
      index = footnote.indexOf(delimiter)+2;
      first_Half = footnote.substring(0, index);
      second_Half = footnote.substring(index);

      output.splice(i+1, 0, [output[i][0], "01", first_Half]);
      output.splice(i+2, 0, [output[i][0], "01", second_Half]);

      output.splice(i, 1);

    }

  }
return output;
}

function containsIndicator(input){
  indicators = reporters.concat(journal_identifiers).concat(statue_identifiers).concat(book_identifiers);
  for (var i = 0; i < indicators.length; i++) {
    if (input.includes(indicators[i])){
      return true;
    }
  }
  return false;
}

function numberCites(input){
  currentFootnoteNum = "000";
  citeNum = 0;

  for (var i = 0; i < input.length; i++) {
    if (input[i][0] === currentFootnoteNum){
      citeNum = parseInt(input[i-1][1])+1;
    }else{
      citeNum = 1;
      currentFootnoteNum = input[i][0];
    }
    
    citeNum = citeNum.toString();
    while (2 > citeNum.length){
      citeNum = "0" + citeNum;
    }
    input[i][1] = citeNum;
  }

  return input;
}

function getCol(input, colNum){
  // Get first column of array

  var output = [];
  for (var i = 0; i < input.length; i++) {
    output[i] = input[i][colNum];
  }

  return output;
}

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}