/* global expect, karmaHTML, jasmine */

import matchers from 'jasmine-dom-custom-matchers';

describe("The body",function(){
  beforeAll(function(done){
    jasmine.addMatchers(matchers);
    karmaHTML.index.open();
    karmaHTML.index.onstatechange = (function (ready){
      if(ready) {
        this.document = karmaHTML.index.document;
        done();
      }
    }).bind(this);
  });

  it("should be a document node.",function(){
    expect(this.document.body).toBeDocumentNode();
  });	
});