'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const HomeRemedy = require('../models/homeremedy');

const HomeRemedies = module.context.collection('HomeRemedies');
const keySchema = joi.string().required()
.description('The key of the homeRemedy');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('homeRemedy');


router.get(function (req, res) {
  res.send(HomeRemedies.all());
}, 'list')
.response([HomeRemedy], 'A list of HomeRemedies.')
.summary('List all HomeRemedies')
.description(dd`
  Retrieves a list of all HomeRemedies.
`);


router.post(function (req, res) {
  const homeRemedy = req.body;
  let meta;
  try {
    meta = HomeRemedies.save(homeRemedy);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(homeRemedy, meta);
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', {key: homeRemedy._key})
  ));
  res.send(homeRemedy);
}, 'create')
.body(HomeRemedy, 'The homeRemedy to create.')
.response(201, HomeRemedy, 'The created homeRemedy.')
.error(HTTP_CONFLICT, 'The homeRemedy already exists.')
.summary('Create a new homeRemedy')
.description(dd`
  Creates a new homeRemedy from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  let homeRemedy
  try {
    homeRemedy = HomeRemedies.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(homeRemedy);
}, 'detail')
.pathParam('key', keySchema)
.response(HomeRemedy, 'The homeRemedy.')
.summary('Fetch a homeRemedy')
.description(dd`
  Retrieves a homeRemedy by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const homeRemedy = req.body;
  let meta;
  try {
    meta = HomeRemedies.replace(key, homeRemedy);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(homeRemedy, meta);
  res.send(homeRemedy);
}, 'replace')
.pathParam('key', keySchema)
.body(HomeRemedy, 'The data to replace the homeRemedy with.')
.response(HomeRemedy, 'The new homeRemedy.')
.summary('Replace a homeRemedy')
.description(dd`
  Replaces an existing homeRemedy with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let homeRemedy;
  try {
    HomeRemedies.update(key, patchData);
    homeRemedy = HomeRemedies.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(homeRemedy);
}, 'update')
.pathParam('key', keySchema)
.body(joi.object().description('The data to update the homeRemedy with.'))
.response(HomeRemedy, 'The updated homeRemedy.')
.summary('Update a homeRemedy')
.description(dd`
  Patches a homeRemedy with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    HomeRemedies.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
.pathParam('key', keySchema)
.response(null)
.summary('Remove a homeRemedy')
.description(dd`
  Deletes a homeRemedy from the database.
`);
