var common = require('../../../common');
var expect = common.expect;
var endpoint = '/api/v1/messages/promote';

// TODO: check that the message was promoted
common.post(
    'post with single id',
    endpoint,
    {id: [ 1 ]},
    (err, res, done) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        done();
    }
);

// TODO: check that the messages were promoted
common.post(
    'post with multiple ids',
    endpoint,
    {id: [ 1, 2, 3 ]},
    (err, res, done) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        done();
    }
);

// TODO: check that no message was promoted
common.post(
    'post with invalid id',
    endpoint,
    {id: [ 1000 ]},
    (err, res, done) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        done();
    }
);

common.post(
    'post with no body',
    endpoint,
    {},
    (err, res, done) => {
        expect(err).to.be.null;
        expect(res).to.have.status(400);
        done();
    }
);
