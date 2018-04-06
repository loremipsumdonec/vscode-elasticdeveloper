import * as assert from 'assert';
import { Version } from '../models/version';

suite("Version.test", () => {

    test("parse_version_returnVersion", () => {

        let versionAsString = '1.2.3'
        let version = Version.parse(versionAsString);
        
        assert.equal(version.major, 1);
        assert.equal(version.minor, 2);
        assert.equal(version.patch, 3);
    });

    test("parse_versionWithHyphen_returnVersion", () => {

        let versionAsString = '1.2.3-alpha'
        let version = Version.parse(versionAsString);
        
        assert.equal(version.major, 1);
        assert.equal(version.minor, 2);
        assert.equal(version.patch, 3);
    });

    test("getClosest_whenVersionIsLowest_returnClosestVersion", () => {
        
        let version = Version.parse('1.2.3');
        let versions:string[] = ['1.2.4', '1.2.5', '1.2.6'];

        let closest = Version.getClosest(version, versions);

        assert.equal(closest.major, 1);
        assert.equal(closest.minor, 2);
        assert.equal(closest.patch, 4);
    });

    test("getClosest_whenVersionIsLowestAndVersionsAreNotSorted_returnClosestVersion", () => {
        
        let version = Version.parse('1.2.3');
        let versions:string[] = ['1.2.6', '1.2.4', '1.2.5'];

        let closest = Version.getClosest(version, versions);

        assert.equal(closest.major, 1);
        assert.equal(closest.minor, 2);
        assert.equal(closest.patch, 4);
    });

    test("getClosest_whenVersionIsHighestAndVersionsAreNotSorted_returnClosestVersion", () => {
        
        let version = Version.parse('1.2.8');
        let versions:string[] = ['1.2.6', '1.2.4', '1.2.5'];

        let closest = Version.getClosest(version, versions);

        assert.equal(closest.major, 1);
        assert.equal(closest.minor, 2);
        assert.equal(closest.patch, 6);
    });
});