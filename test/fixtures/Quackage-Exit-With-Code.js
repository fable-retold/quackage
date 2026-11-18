/**
* Test fixture for the QuackageProcess exit code tests.
*
* Usage: node Quackage-Exit-With-Code.js <exit code | signal name>
*
* Writes a line to stdout and stderr, then either exits with the numeric code
* given or, when given a signal name such as SIGTERM, kills itself with that
* signal.
*
* @author      Steven Velozo <steven@velozo.com>
*/

let tmpRequestedOutcome = process.argv[2] || '0';

console.log(`Quackage exit fixture: stdout before [${tmpRequestedOutcome}]`);
console.error(`Quackage exit fixture: stderr before [${tmpRequestedOutcome}]`);

if (tmpRequestedOutcome.indexOf('SIG') === 0)
{
	process.kill(process.pid, tmpRequestedOutcome);
}
else
{
	process.exit(parseInt(tmpRequestedOutcome, 10));
}
