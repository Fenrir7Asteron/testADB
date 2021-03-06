'use strict';
const dd = require('dedent');
const joi = require('joi');
const httpError = require('http-errors');
const status = require('statuses');
const errors = require('@arangodb').errors;
const createRouter = require('@arangodb/foxx/router');
const Appointment = require('../models/appointment');
const perms = module.context.collection('hasPerm');
const permission = require('../util/permissions');
const restrict = require('../util/restrict');
const hasPerm = require('../util/hasPerm');

const Appointments = module.context.collection('Appointments');
const keySchema = joi.string().required()
  .description('The key of the appointment');

const ARANGO_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;
const ARANGO_DUPLICATE = errors.ERROR_ARANGO_UNIQUE_CONSTRAINT_VIOLATED.code;
const ARANGO_CONFLICT = errors.ERROR_ARANGO_CONFLICT.code;
const HTTP_NOT_FOUND = status('not found');
const HTTP_CONFLICT = status('conflict');

const router = createRouter();
module.exports = router;


router.tag('appointment');


router.get(restrict(permission.appointments.view), function (req, res) {
  res.send(Appointments.all());
}, 'list')
  .response([Appointment], 'A list of Appointments.')
  .summary('List all Appointments')
  .description(dd`
  Retrieves a list of all Appointments.
`);


router.post(restrict(permission.appointments.create), function (req, res) {
  const appointment = req.body;
  const patient = patients.firstExample("_id", user_id);
  if (!patient) res.throw(403, 'Not a patient!');
  let meta;
  try {
    appointment.area = patient.residential_area;
    meta = Appointments.save(appointment);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_DUPLICATE) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(appointment, meta);
  perms.save({ _from: req.user._id, _to: appointment._id, name: permission.appointments.view });
  perms.save({ _from: req.user._id, _to: appointment._id, name: permission.appointments.edit });
  perms.save({ _from: req.user._id, _to: appointment._id, name: permission.appointments.delete });
  res.status(201);
  res.set('location', req.makeAbsolute(
    req.reverse('detail', { key: appointment._key })
  ));
  res.send(appointment);
}, 'create')
  .body(Appointment, 'The appointment to create.')
  .response(201, Appointment, 'The created appointment.')
  .error(HTTP_CONFLICT, 'The appointment already exists.')
  .summary('Create a new appointment')
  .description(dd`
  Creates a new appointment from the request body and
  returns the saved document.
`);


router.get(':key', function (req, res) {
  const key = req.pathParams.key;
  const appointmentId = `${Appointments.name()}/${key}`;
  if (!hasPerm(req.user._id, permission.appointments.view, appointmentId)) res.throw(403, 'Not authorized');
  let appointment;
  try {
    appointment = Appointments.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
  res.send(appointment);
}, 'detail')
  .pathParam('key', keySchema)
  .response(Appointment, 'The appointment.')
  .summary('Fetch a appointment')
  .description(dd`
  Retrieves a appointment by its key.
`);


router.put(':key', function (req, res) {
  const key = req.pathParams.key;
  const appointment = req.body;
  let meta;
  try {
    meta = Appointments.replace(key, appointment);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(appointment, meta);
  res.send(appointment);
}, 'replace')
  .pathParam('key', keySchema)
  .body(Appointment, 'The data to replace the appointment with.')
  .response(Appointment, 'The new appointment.')
  .summary('Replace a appointment')
  .description(dd`
  Replaces an existing appointment with the request body and
  returns the new document.
`);

router.put(':key/assign', function (req, res) {
  const key = req.pathParams.key;
  const appointmentId = `${Appointments.name()}/${key}`;
  if (!hasPerm(req.user._id, permission.appointments.assign, appointmentId)) res.throw(403, 'Not authorized');
  let meta;
  try {
    meta = Appointments.replace(key, appointment);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  Object.assign(appointment, meta);
  res.send(appointment);
}, 'replace')
  .pathParam('key', keySchema)
  .body(joi.object({
    doctor: joi.string().required(),
    datetime: joi.date().required()
  }).required(), 'Appointment data')
  .summary('Assign an appointment')
  .description(dd`
  Assign the appointment to a given doctor
`);


router.patch(':key', function (req, res) {
  const key = req.pathParams.key;
  const patchData = req.body;
  let appointment;
  try {
    Appointments.update(key, patchData);
    appointment = Appointments.document(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    if (e.isArangoError && e.errorNum === ARANGO_CONFLICT) {
      throw httpError(HTTP_CONFLICT, e.message);
    }
    throw e;
  }
  res.send(appointment);
}, 'update')
  .pathParam('key', keySchema)
  .body(joi.object().description('The data to update the appointment with.'))
  .response(Appointment, 'The updated appointment.')
  .summary('Update a appointment')
  .description(dd`
  Patches a appointment with the request body and
  returns the updated document.
`);


router.delete(':key', function (req, res) {
  const key = req.pathParams.key;
  try {
    Appointments.remove(key);
  } catch (e) {
    if (e.isArangoError && e.errorNum === ARANGO_NOT_FOUND) {
      throw httpError(HTTP_NOT_FOUND, e.message);
    }
    throw e;
  }
}, 'delete')
  .pathParam('key', keySchema)
  .response(null)
  .summary('Remove a appointment')
  .description(dd`
  Deletes a appointment from the database.
`);
