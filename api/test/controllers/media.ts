import {Server} from '../../src/server';
import * as chai from 'chai';
import chaiHttp = require('chai-http');
import {TestHelper} from '../TestHelper';
import {FixtureUtils} from '../../fixtures/FixtureUtils';
import {JwtUtils} from '../../src/security/JwtUtils';
import {Directory} from '../../src/models/mediaManager/Directory';
import {File} from '../../src/models/mediaManager/File';
import config from '../../src/config/main';
import * as fs from 'fs';

chai.use(chaiHttp);
const should = chai.should();
const app = new Server().app;
const BASE_URL = '/api/media';
const testHelper = new TestHelper(BASE_URL);

describe('Media', async () => {
  beforeEach(() => testHelper.resetForNextTest());

  describe(`GET ${BASE_URL}`, async () => {
    it('should get a directory', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const file = await new File({
        name: 'root',
        link: 'test/a',
        size: 129
      }).save();
      const subDirectory = await new Directory({
        name: 'sub'
      }).save();
      const rootDirectory = await new Directory({
        name: 'root',
        subDirectories: [subDirectory],
        files: [file]
      }).save();

      const result = await testHelper.commonUserGetRequest(teacher, `/directory/${rootDirectory.id}`);
      result.status.should.be.equal(200,
        'could not get directory' +
        ' -> ' + result.body.message);
      result.body.name.should.equal(rootDirectory.name);
      result.body.subDirectories.should.be.instanceOf(Array)
        .and.have.lengthOf(1)
        .and.contains(subDirectory.id);
      result.body.files.should.be.instanceOf(Array)
        .and.have.lengthOf(1)
        .and.contains(file.id);
    });

    it('should get a populated directory', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const file = await new File({
        name: 'root',
        link: 'test/a',
        size: 129
      }).save();
      const subDirectory = await new Directory({
        name: 'sub'
      }).save();
      const rootDirectory = await new Directory({
        name: 'root',
        subDirectories: [subDirectory],
        files: [file]
      }).save();


      const result = await testHelper.commonUserGetRequest(teacher, `/directory/${rootDirectory.id}/lazy`);
      result.status.should.be.equal(200,
        'could not get directory' +
        ' -> ' + result.body.message);
      result.body._id.should.be.equal(rootDirectory.id);
      result.body.name.should.equal(rootDirectory.name);
      result.body.subDirectories.should.be.instanceOf(Array)
        .and.have.lengthOf(1);
      result.body.subDirectories[0]._id.should.be.equal(subDirectory.id);
      result.body.subDirectories[0].name.should.be.equal(subDirectory.name);
      result.body.subDirectories[0].subDirectories.should.be.instanceOf(Array)
        .and.have.lengthOf(subDirectory.subDirectories.length);
      result.body.subDirectories[0].files.should.be.instanceOf(Array)
        .and.have.lengthOf(subDirectory.files.length);
      result.body.files.should.be.instanceOf(Array)
        .and.have.lengthOf(1);
      result.body.files[0]._id.should.be.equal(file.id);
      result.body.files[0].name.should.be.equal(file.name);
      result.body.files[0].size.should.be.equal(file.size);
      result.body.files[0].link.should.be.equal(file.link);
    });

    it('should get a file', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const file = await new File({
        name: 'root',
        link: 'test/a',
        size: 129
      }).save();

      const result = await testHelper.commonUserGetRequest(teacher, `/file/${file.id}`);
      result.status.should.be.equal(200,
        'could not get file' +
        ' -> ' + result.body.message);
      result.body._id.should.be.equal(file.id);
      result.body.name.should.be.equal(file.name);
      result.body.size.should.be.equal(file.size);
      result.body.link.should.be.equal(file.link);
    });
  });

  describe(`POST ${BASE_URL}`, async () => {
    it('should create a root directory', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const rootDirectory = new Directory({
        name: 'root'
      });

      const result = await testHelper.commonUserPostRequest(teacher, '/directory', rootDirectory);
      result.status.should.be.equal(200,
        'could not create root' +
        ' -> ' + result.body.message);
      result.body.__v.should.equal(0);
      result.body.name.should.equal(rootDirectory.name);
      result.body.subDirectories.should.be.instanceOf(Array)
        .and.have.lengthOf(0);
      result.body.files.should.be.instanceOf(Array).and.lengthOf(0);
    });

    it('should create a sub directory', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const rootDirectory = await new Directory({
        name: 'root'
      }).save();

      const subDirectory = await new Directory({
        name: 'sub'
      });

      const result = await testHelper.commonUserPostRequest(teacher, `/directory/${rootDirectory._id}`, subDirectory);
      result.status.should.be.equal(200,
        'could not create subdirectory' +
        ' -> ' + result.body.message);
      result.body.__v.should.equal(0);
      result.body.name.should.equal(subDirectory.name);
      result.body.subDirectories.should.be.instanceOf(Array)
        .and.have.lengthOf(0);
      result.body.files.should.be.instanceOf(Array)
        .and.lengthOf(0);

      const updatedRoot = (await Directory.findById(rootDirectory));
      updatedRoot.subDirectories.should.be.instanceOf(Array)
        .and.have.lengthOf(1)
        .and.contains(result.body._id);
    });

    it('should upload a file', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const rootDirectory = await new Directory({
        name: 'root'
      }).save();

      const testFileName = 'test_file.txt';
      const testFile = fs.readFileSync('./test/resources/' + testFileName);

      const result = await chai.request(app)
        .post(`${BASE_URL}/file/${rootDirectory._id}`)
        .set('Cookie', `token=${JwtUtils.generateToken(teacher)}`)
        .attach('file', testFile, testFileName)
        .catch((err) => err.response);

      result.status.should.be.equal(200,
        'could not upload file' +
        ' -> ' + result.body.message);
      result.body.__v.should.equal(0);
      should.exist(result.body._id);
      should.exist(result.body.mimeType);
      should.exist(result.body.size);
      should.exist(result.body.link);
      result.body.name.should.be.equal(testFileName);

      const updatedRoot = (await Directory.findById(rootDirectory));
      updatedRoot.files.should.be.instanceOf(Array)
        .and.have.lengthOf(1)
        .and.contains(result.body._id);
    });


    it('should upload a file without extension', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const rootDirectory = await new Directory({
        name: 'root'
      }).save();

      const testFileName = 'test_file_without_extension';
      const testFile = fs.readFileSync('./test/resources/' + testFileName);

      const result = await chai.request(app)
        .post(`${BASE_URL}/file/${rootDirectory._id}`)
        .set('Cookie', `token=${JwtUtils.generateToken(teacher)}`)
        .attach('file', testFile, testFileName)
        .catch((err) => err.response);

      result.status.should.be.equal(200,
        'could not upload file' +
        ' -> ' + result.body.message);
      result.body.__v.should.equal(0);
      should.exist(result.body._id);
      should.exist(result.body.mimeType);
      should.exist(result.body.size);
      should.exist(result.body.link);
      result.body.name.should.be.equal(testFileName);

      const updatedRoot = (await Directory.findById(rootDirectory));
      updatedRoot.files.should.be.instanceOf(Array)
        .and.have.lengthOf(1)
        .and.contains(result.body._id);
    });
  });

  describe(`PUT ${BASE_URL}`, async () => {
    it('should rename a directory', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const rootDirectory = await new Directory({
        name: 'root'
      }).save();

      const renamedDirectory = rootDirectory;
      renamedDirectory.name = 'renamedRoot';

      const result = await testHelper.commonUserPutRequest(teacher, `/directory/${rootDirectory._id}`, renamedDirectory);
      result.status.should.be.equal(200,
        'could not rename directory' +
        ' -> ' + result.body.message);
      result.body._id.should.equal(rootDirectory.id);
      result.body.name.should.equal(renamedDirectory.name);
      result.body.subDirectories.should.be.instanceOf(Array)
        .and.have.lengthOf(rootDirectory.subDirectories.length);
      result.body.files.should.be.instanceOf(Array)
        .and.lengthOf(rootDirectory.files.length);
    });

    it('should rename a file', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const file = await new File({
        name: 'file',
        link: 'test/a',
        size: 129
      }).save();

      const renamedFile = file;
      file.name = 'renamedFile';

      const result = await testHelper.commonUserPutRequest(teacher, `/file/${file._id}`, renamedFile);
      result.status.should.be.equal(200,
        'could not rename file' +
        ' -> ' + result.body.message);
      result.body._id.should.equal(file.id);
      result.body.name.should.equal(renamedFile.name);
      result.body.link.should.equal(file.link);
      result.body.size.should.equal(file.size);
    });
  });

  describe(`DELETE ${BASE_URL}`, async () => {
    it('should delete a directory', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const subDirectory = await new Directory({
        name: 'sub'
      }).save();
      const rootDirectory = await new Directory({
        name: 'root',
        subDirectories: [subDirectory],
      }).save();

      const result = await testHelper.commonUserDeleteRequest(teacher, `/directory/${rootDirectory._id}`);
      result.status.should.be.equal(200,
        'could not delete directory' +
        ' -> ' + result.body.message);
      should.not.exist(await Directory.findById(rootDirectory));
    });

    it('should delete a directory and its subdirectories', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const subDirectory = await new Directory({
        name: 'sub'
      }).save();
      const rootDirectory = await new Directory({
        name: 'root',
        subDirectories: [subDirectory],
      }).save();

      const result = await testHelper.commonUserDeleteRequest(teacher, `/directory/${rootDirectory._id}`);
      result.status.should.be.equal(200,
        'could not delete directory' +
        ' -> ' + result.body.message);
      should.not.exist(await Directory.findById(rootDirectory));
      should.not.exist(await Directory.findById(subDirectory));
    });


    it('should delete a directory and its files', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const testFileName = fs.readdirSync('./')[0];
      const testFile = fs.readFileSync(testFileName);
      fs.copyFileSync(testFileName, config.uploadFolder + '/test.file');

      const file = await new File({
        name: 'root',
        physicalPath: config.uploadFolder + '/test.file',
        link: testFileName,
        size: testFile.length
      }).save();
      const rootDirectory = await new Directory({
        name: 'root',
        files: [file]
      }).save();

      const result = await testHelper.commonUserDeleteRequest(teacher, `/directory/${rootDirectory._id}`);
      result.status.should.be.equal(200,
        'could not delete directory' +
        ' -> ' + result.body.message);
      should.not.exist(await Directory.findById(rootDirectory));
      should.not.exist(await File.findById(file));
    });

    it('should delete a file', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const testFileName = fs.readdirSync('./')[0];
      const testFile = fs.readFileSync(testFileName);
      fs.copyFileSync(testFileName, config.uploadFolder + '/test.file');

      const file = await new File({
        name: 'root',
        physicalPath: config.uploadFolder + '/test.file',
        link: testFileName,
        size: testFile.length
      }).save();

      const result = await testHelper.commonUserDeleteRequest(teacher, `/file/${file._id}`);
      result.status.should.be.equal(200,
        'could not delete file' +
        ' -> ' + result.body.message);
      should.not.exist(await File.findById(file));
      fs.existsSync(config.uploadFolder + '/test.file').should.be.equal(false);
    });

    it('should fail when directory not found', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const result = await testHelper.commonUserDeleteRequest(teacher, '/directory/507f1f77bcf86cd799439011');
      result.status.should.be.equal(404);
    });

    it('should fail when file not found', async () => {
      const teacher = await FixtureUtils.getRandomTeacher();

      const result = await testHelper.commonUserDeleteRequest(teacher, '/file/507f1f77bcf86cd799439011');
      result.status.should.be.equal(404);
    });
  });
});
