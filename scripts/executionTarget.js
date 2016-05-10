function test() {
  Logger.log(getCategories(100));
  Logger.log(getQuestions("U.S. CITIES", 5));
}
/**
 * will do a bigquery to return categories
 * @param {number} maxCats maximum categories
 * @param {boolean} noCache whether to suppress cache
 * @return {object} the result
 */
function getCategories (maxCats,noCache) {
  App.init();
  var ag = App.globals.bigQuery;
  
  var sqlString =  'SELECT COUNT(*) as num,category FROM' + 
    ' [' + ag.dataStore + '.' + ag.table + ']' + 
      ' GROUP BY category' +
      ' ORDER BY num DESC' +
      ' LIMIT ' + maxCats;
  // use cache if allowed
  var cache = CacheService.getScriptCache();
  var cacheKey = cUseful.Utils.keyDigest (sqlString);
  var data = noCache ? null : cache.get(cacheKey);
  var result = data ? JSON.parse(data) : doQuery_ (sqlString);

  // always write it to cache regardless
  cache.put(cacheKey, JSON.stringify(result),60*60*6);
  return result;
  
}

/**
 * will be called by any script wanting some questions
 * @param {string} category the category
 * @param {number} numAnswers number of answers to provide
 * @return {object] the result
 */
function getQuestions (category, numAnswers) {
  App.init();
  var ag = App.globals.bigQuery;
  // get a number of questions
  var sqlString =  'SELECT *, rand() as rand FROM' + 
    ' [' + ag.dataStore + '.' + ag.table + ']' + 
    ' WHERE category = "' + category +'"' +
    ' ORDER BY rand' +
    ' LIMIT ' + numAnswers;

  var data  = doQuery_ (sqlString);
    
  // reduce the results to just what we need
  var shuffled = shuffleArray(data.slice());
  
  var result = {
    answers:shuffled.map(function (d) {
      return d.answer;
    }),
    picked:data[0]
  };
 
  return result;
  
  // from http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }
}

function doQuery_ (sqlString) {

  
  sqlString =  sqlString || 'SELECT *, rand() as rand FROM' + 
    ' [jeopardydata.questions]' + 
    ' WHERE category = "COMMUNICATIONS"' +
    ' ORDER BY rand' +
    ' LIMIT 4';
  // do the query
  
  var ag = App.globals.bigQuery;
  return QueryUtils.query (
    App.goa.getProperty("apiKey"), 
    App.goa.getToken(),
    ag.projectId,
    sqlString);

}
