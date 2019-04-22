'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const IsAppointed = require('../models/isappointed');

const isAssignedItems = module.context.collection('isAssigned');
const keySchema = joi.string().required()
    .description('The key of the isAssigned');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('isAssigned');


const NewIsAppointed = Object.assign({}, IsAppointed, {
    schema: Object.assign({}, IsAppointed.schema, {
        _from: joi.string(),
        _to: joi.string()
    })
});



router.get(function (req, res) {
    if (!hasPerm(req.user._id, permission.appointments.view)) res.throw(403, 'Not authorized');
    res.send(isAssignedItems.all());
}, 'list')
    .response([IsAppointed], 'A list of isAppointedItems.')
    .summary('List all isAppointedItems')
    .description(dd`
  Retrieves a list of all isAppointedItems.
`);


router.post(function (req, res) {
    if (!hasPerm(req.user._id, permission.appointments.create)) res.throw(403, 'Not authorized');
    const isAssigned = req.body;
    let meta;
    try {
        meta = isAssignedItems.save(isAssigned._from, isAssigned._to, isAssigned);
    } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
            throw httpError(HTTP_CONFLICT, e.message);
        }
        throw e;
    }
    Object.assign(isAssigned, meta);
    res.status(201);
    res.set('location', req.makeAbsolute(
        req.reverse('detail', {key: isAssigned._key})
    ));
    res.send(isAssigned);
}, 'create')
    .body(NewIsAppointed, 'The isAssigned to create.')
    .response(201, IsAppointed, 'The created isAssigned.')
    .error(HTTP_CONFLICT, 'The isAssigned already exists.')
    .summary('Create a new isAssigned')
    .description(dd`
  Creates a new isAssigned from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
    if (!hasPerm(req.user._id, permission.appointments.view)) res.throw(403, 'Not authorized');
    const key = req.pathParams.key;
    let isAssigned;
    try {
        isAssigned = isAssignedItems.document(key);
    } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
            throw httpError(HTTP_NOT_FOUND, e.message);
        }
        throw e;
    }
    res.send(isAssigned);
}, 'detail')
    .pathParam('key', keySchema)
    .response(IsAppointed, 'The isAssigned.')
    .summary('Fetch an isAssigned')
    .description(dd`
  Retrieves an isAssigned by its key.
`);


router.put(':key', function (req, res) {
    if (!hasPerm(req.user._id, permission.appointments.edit)) res.throw(403, 'Not authorized');
    const key = req.pathParams.key;
    const isAssigned = req.body;
    let meta;
    try {
        meta = isAssignedItems.replace(key, isAssigned);
    } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
            throw httpError(HTTP_NOT_FOUND, e.message);
        }
        if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
            throw httpError(HTTP_CONFLICT, e.message);
        }
        throw e;
    }
    Object.assign(isAssigned, meta);
    res.send(isAssigned);
}, 'replace')
    .pathParam('key', keySchema)
    .body(IsAppointed, 'The data to replace the isAssigned with.')
    .response(IsAppointed, 'The new isAssigned.')
    .summary('Replace an isAssigned')
    .description(dd`
  Replaces an existing isAssigned with the request body and
  returns the new document.
`);


router.patch(':key', function (req, res) {
    const key = req.pathParams.key;
    const appointmentId = `${appointments.name()}/${key}`;
    if (!hasPerm(req.user._id, permission.appointments.edit, appointmentId)) res.throw(403, 'Not authorized');
    const patchData = req.body;
    let isAssigned;
    try {
        isAssignedItems.update(key, patchData);
        isAssigned = isAssignedItems.document(key);
    } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
            throw httpError(HTTP_NOT_FOUND, e.message);
        }
        if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
            throw httpError(HTTP_CONFLICT, e.message);
        }
        throw e;
    }
    res.send(isAssigned);
}, 'update')
    .pathParam('key', keySchema)
    .body(joi.object().description('The data to update the isAssigned with.'))
    .response(IsAppointed, 'The updated isAssigned.')
    .summary('Update an isAssigned')
    .description(dd`
  Patches an isAssigned with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
    if (!hasPerm(req.user._id, permission.appointments.delete)) res.throw(403, 'Not authorized');
    const key = req.pathParams.key;
    try {
        isAssignedItems.remove(key);
    } catch (e) {
        if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
            throw httpError(HTTP_NOT_FOUND, e.message);
        }
        throw e;
    }
}, 'delete')
    .pathParam('key', keySchema)
    .response(null)
    .summary('Remove a isAssigned')
    .description(dd`
  Deletes a isAssigned from the database.
`);
