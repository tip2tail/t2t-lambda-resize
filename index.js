'use strict';

/**
 * Created by Mark Young (Tip2Tail Ltd)
 */

// Dependancies
var AWS 	= require('aws-sdk');
var gm		= require('gm').subClass({ imageMagick: true });
var util	= require('util');
var Q		= require('q');
var strObj	= require('stringify-object');

// Create a new S3 object
var s3 = new AWS.S3();

// Image types allowed
var	WHITELIST = [
	'image/jpeg',
	'image/jpg',
	'image/png'
];

// Enable Debug Mode?
var DEBUG_MODE = (process.env.T2T_DEBUG_MODE === 'TRUE');

/**
 * Main entry point of the service.
 *
 * @param {object}  event       The data regarding the event.
 * @param {object}  context     The AWS Lambda execution context.
 */
exports.handler = function(event, context) {

	var bucket = event.Records[0].s3.bucket.name
	var source = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
	var destinationBucket = bucket.replace("uploads", "photos");

	// Log the buckets
	doLog('Source Bucket = ' + bucket);
	doLog('Source Key = ' + source);
	doLog('Destination Bucket = ' + destinationBucket);

	Q.fcall(function() {
		// Retrieve the object
		return [
			getObject({Bucket: bucket, Key: source}),
			getACL({Bucket: bucket, Key: source})
		];
	}).spread(function(s3Obj, s3Acl) {

		doLog('.spread() (1) called');

		if(WHITELIST.indexOf(s3Obj.ContentType.split(';').shift()) === -1) {

			// Log the error
			console.error(s3Obj.ContentType + ' could not be parsed');
			doLog('Invalid Content Type - copying to destination without manipulation.');

			// If the mimetype is not in the whitelist, pass it to the following step
			return [
				s3Obj.ContentType,
				s3Acl,
				s3Obj.Body,
				null,
				null,
				null
			];
		}

		// Scale and crop the image
		return [
			s3Obj.ContentType,
			s3Acl,
			imgThumbnail(s3Obj.Body, 150),
			imgThumbnail(s3Obj.Body, 250),
			imgThumbnail(s3Obj.Body, 400),
			imgResize(s3Obj.Body, '1024x>')
		];

	}).spread(function(contentType, objAcl, buffer150, buffer250, buffer400, bufferFull) {
		doLog('.spread() (2) called');

		if (buffer250 === null && buffer400 === null) {
			return putObject({Bucket: destinationBucket, Key: source, Body: buffer150, ContentType: contentType}, null, objAcl);
		}

		// Store the image and the correct location
		return [
			putObject({Bucket: destinationBucket, Key: source, Body: buffer150, ContentType: contentType}, 150, objAcl),
			putObject({Bucket: destinationBucket, Key: source, Body: buffer250, ContentType: contentType}, 250, objAcl),
			putObject({Bucket: destinationBucket, Key: source, Body: buffer400, ContentType: contentType}, 400, objAcl),
			putObject({Bucket: destinationBucket, Key: source, Body: bufferFull, ContentType: contentType}, 'full', objAcl)
		];
	}).all(function() {
		// Everything went well
		doLog('.all() called - All OK');
		context.succeed();
	}).catch(function(err) {
		// Log the error
		console.error(err);

		// Let the function fail
		context.fail(err);
	});

	function getObject(obj) {
		return Q.Promise(function (resolve, reject) {
			// Retrieve the object
			s3.getObject(obj, function (err, result) {
				if (err) {
					// Reject because something went wrong
					doLog('Error on s3.getObject');
					return reject(err);
				}

				// We retrieved the object successfully
				resolve(result);
			});
		});
	}

	function getACL(obj) {
		return Q.Promise(function (resolve, reject) {
			// Retrieve the ACL for this object
			s3.getObjectAcl(obj, function (err, result) {
				if (err) {
					// Reject
					doLog('Error on s3.getObjectAcl');
					return reject(err);
				}

				// We have the ACL
				resolve(result);
			})
		});
	}

	function putObject(obj, imgSize, objAcl) {
		return Q.Promise(function(resolve, reject) {

			// Set the size key (unless this is a pass through copy)
			if (imgSize !== null) {
				obj.Key = imgSize.toString() + '/' + obj.Key;
			} else {
				obj.Key = 'Rejected' + '/' + obj.Key;
			}
			doLog('putObject, obj.Key = ' + obj.Key);

			// Retrieve the object
			s3.putObject(obj, function(err, result) {
				if(err) {
					// Reject because something went wrong
					doLog('Error on s3.putObject');
					return reject(err);
				}
				doLog('Object stored OK: ' + obj.Key);

				// Now set the ACL...
				var aclParams = {
					Bucket: obj.Bucket,
					Key: obj.Key,
					AccessControlPolicy: objAcl
				};
				doLog('New ACL: ' + objToString(aclParams));

				s3.putObjectAcl(aclParams, function(err, result) {

					if(err) {
						// Reject because something went wrong
						doLog('Error on s3.putObjectAcl');
						return reject(err);
					}

					doLog('Object ACL updated OK: ' + obj.Key);

					// We stored the object & copied the same ACL permissions successfully
					resolve(result);

				});
			});
		});
	}

	function imgThumbnail(img, imgSize) {
		return Q.Promise(function(resolve, reject) {

			// Log what size
			doLog('imgThumbnail() called with imgSize = ' + imgSize);

			// Retrieve the size of the img
			gm(img).size(function(err, size) {
				if(err) {
					// Reject the promise if an error occurred
					return reject(err);
				}

				// Calculate the maximum square we can extract
				var square = Math.min(size.width, size.height),
					x = (size.width / 2) - (square / 2),
					y = (size.height / 2) - (square / 2);

				// Extract the middle square and resize to the SIZE defined
				gm(img).crop(square, square, x, y).resize(imgSize, imgSize).autoOrient().toBuffer(function(err, buffer) {
					if(err) {
						// Reject the promise if an error occurred
						return reject(err);
					}
					// Resolve the buffer if everything went well
					resolve(buffer);
				});
			});
		});
	}

	function imgResize(img, imgSize) {
		return Q.Promise(function(resolve, reject) {

			// Log what size
			doLog('imgResize() called with imgSize = ' + imgSize);

			// Simple resize this here
			gm(img).resize(imgSize).toBuffer(function (err, buffer) {
				if (err) {
					// Reject the promise if an error occurred
					return reject(err);
				}
				// Resolve the buffer if everything went well
				resolve(buffer);
			});
		});
	}

	function doLog(logEntry) {
		if (DEBUG_MODE) {
			console.log(logEntry);
		}
	}

	function objToString(obj) {
		return strObj(obj, {
			indent: '  ',
			singleQuotes: false
		});
	}

};