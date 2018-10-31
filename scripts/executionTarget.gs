function test() {
  //Logger.log(getCategories(100));
  Logger.log(JSON.stringify(getQuestions("U.S. CITIES", 5,2)));
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

  // always write it to cache regardless - maximum that it can be stored is 6 hours
  cache.put(cacheKey, JSON.stringify(result),60*60*6);
  return result;
  
}

/**
 * will be called by any script wanting some questions
 * @param {string} category the category
 * @param {number} numAnswers number of answers to provide
 * @param {number} chunkSize the number of questions to get
 * @return {object] the result
 */
function getQuestions (category, numAnswers, chunkSize) {
  App.init();
  var ag = App.globals.bigQuery;
  
  // get a number of questions plus a few more in case there are duplicate answers
  var sqlString =  'SELECT *, rand() as rand FROM' + 
    ' [' + ag.dataStore + '.' + ag.table + ']' + 
    ' WHERE category = "' + category +'"' +
    ' ORDER BY rand' +
    ' LIMIT ' + Math.ceil(numAnswers * chunkSize * 1.2);

  // do the query
  var data  = doQuery_ (sqlString);
  
  // get rid of anything with duplicate answers
  // its possible that this will return less than chunk size
  // but the caller shoudl be asking for more than they need anyway
  data = data.filter(function (d,i,a) {
    return !a.slice(0,i).some(function(e) {
      return e.answer === d.answer;
    });
  });
  
  // now separate into separate questions - first select a chunk of questions
  var questions = data.splice(0,chunkSize);
  
  // use the rest for multiple choice potential answers
  return {
    category:category,
    questions:questions.map (function (d) {
      return {
        picked:d,
        answers:shuffleArray([d].concat(data.splice(0,numAnswers - 1))).map(function (d) {
          return d.answer;
        })
      };
    })
  };
    
  
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

  var ag = App.globals.bigQuery;
  return QueryUtils.query (
    App.goa.getProperty("apiKey"), 
    App.goa.getToken(),
    ag.projectId,
    sqlString);

}
