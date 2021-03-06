"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.downloadDir = downloadDir;
exports.downloadFile = downloadFile;

var _ssh2SftpClient = _interopRequireDefault(require("ssh2-sftp-client"));

var _fsExtra = require("fs-extra");

var _path = require("path");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const {
  CMDS
} = _utils.log;
const sftp = new _ssh2SftpClient.default();

const sftpClient = require('./sftp').default(sftp); // downloadDir({
//   sftpOption: testSftpOption,
//   remoteSource, 
//   localTarget: 'localTarget'
// }).then(res => {
//   console.log(res);
// });
// sftp.connect(testSftpOption).then(res => {
//   sftpClient.shallowDiff('abc', remoteSource)
//   .then(res => console.log(res))
//   .catch( _ => evts.emit('exit', _.message));
//   // sftp.stat(remoteSource).then(res => {
//   //   console.log(res)
//   // }).catch(e=>console.log(e.message));
// });


function downloadInfo(localpath, remotepath) {
  _utils.events.emit('info', CMDS.DOWNLOAD, `${(0, _utils.calcText)(remotepath)} to ${(0, _utils.calcText)(localpath)}`);
}

function downloadFile(_x) {
  return _downloadFile.apply(this, arguments);
}

function _downloadFile() {
  _downloadFile = _asyncToGenerator(function* ({
    remoteSource,
    localTarget
  }) {
    _utils.spinner.start('making remote assetsMap.');

    yield sftpClient.connect();

    _utils.spinner.step(`downloading ${remoteSource}`);

    const eq = yield sftpClient.shallowDiff(localTarget, remoteSource);

    if (!eq) {
      yield sftp.fastGet(remoteSource, localTarget, {
        step(got, size, all) {
          _utils.spinner.step(`${parseFloat(got / all * 100).toFixed(2)}% downloading ${remoteSource}`);
        }

      });

      _utils.spinner.clear();

      downloadInfo(localTarget, remoteSource);

      _utils.spinner.succeed('one file downloaded.');
    } else {
      _utils.events.emit('info', CMDS.DONE, `exists: ${localTarget}.`);
    }

    sftp.end();
    return {
      remoteSource,
      localTarget
    };
  });
  return _downloadFile.apply(this, arguments);
}

function downloadDir({
  remoteSource,
  localTarget
}) {
  _utils.spinner.start('making remote assetsMap.');

  return sftpClient.connect().then(() => {
    return sftp.client.exec('cd /home/others/test-ssh-uload && tar -cf n.zip node_modules', function (err, stream) {
      if (err) throw err;
      stream.on('close', function (code, signal) {
        console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
        sftp.end();
      }).on('data', function (data) {
        console.log('STDOUT: ' + data);
      }).stderr.on('data', function (data) {
        console.log('STDERR: ' + data);
      });
    });
    return getRemoteList(sftp, remoteSource).then(res => {
      if (res && res.length) {
        (0, _fsExtra.ensureDirSync)(localTarget);
        return downloadAll(remoteSource, localTarget, res);
      }
    });
  });
}

function downloadAll(remoteSource, localTarget, files) {
  if (files && files.length) {
    const filesProms = files.map((file, i) => {
      const localpath = (0, _utils.normalizePath)(localTarget, file.replace(remoteSource, ''));
      const dir = (0, _path.dirname)(localpath);
      if (i == 0) _utils.spinner.step(`downloading ${file}`);
      (0, _fsExtra.ensureDirSync)(dir);
      return sftp.fastGet(file, localpath, {
        step(got, size, all) {
          _utils.spinner.step(`${Math.round(got / all * 100)}% downloading ${file}`);
        }

      }).then(() => {
        _utils.spinner.clear();

        downloadInfo(localpath, file);
        return Promise.resolve({
          file,
          localpath
        });
      });
    });
    return Promise.all(filesProms).then(res => {
      sftp.end();

      _utils.spinner.succeed(`all ${files.length} files downloaded.`);

      return Promise.resolve(res);
    });
  }
}

function getRemoteList(_x2, _x3) {
  return _getRemoteList2.apply(this, arguments);
}

function _getRemoteList2() {
  _getRemoteList2 = _asyncToGenerator(function* (sftp, rDir) {
    // return new Promise((rs, rj) => {
    const remoteFileList = [];

    function _getRemoteList(_x4, _x5) {
      return _getRemoteList3.apply(this, arguments);
    }

    function _getRemoteList3() {
      _getRemoteList3 = _asyncToGenerator(function* (sftp, dir) {
        const res = yield sftp.list(dir);

        if (res.length) {
          const hasMore = res.filter(item => item.type === 'd').length;

          if (hasMore) {
            for (const _ref of res) {
              const {
                name,
                type
              } = _ref;

              // 没有深层递归遍历
              if (type === 'd') {
                yield _getRemoteList(sftp, (0, _utils.normalizePath)(dir, name));
              } else if (type === '-') {
                remoteFileList.push((0, _utils.normalizePath)(dir, name));
              }
            }
          } else {
            res.forEach(({
              name
            }) => remoteFileList.push((0, _utils.normalizePath)(dir, name)));
          }
        }
      });
      return _getRemoteList3.apply(this, arguments);
    }

    yield _getRemoteList(sftp, rDir);
    return remoteFileList; // });
  });
  return _getRemoteList2.apply(this, arguments);
}