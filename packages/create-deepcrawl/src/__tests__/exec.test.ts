import assert from 'node:assert/strict';
import test from 'node:test';
import { quoteWindowsArg, runCommand } from '../lib/exec.js';

test('runCommand forwards stdout/stderr chunks while keeping captured output', async () => {
  const forwardedStdout: string[] = [];
  const forwardedStderr: string[] = [];

  const result = await runCommand(
    process.execPath,
    ['-e', "process.stdout.write('out'); process.stderr.write('err');"],
    {
      mode: 'pipe',
      onStdout(chunk) {
        forwardedStdout.push(chunk);
      },
      onStderr(chunk) {
        forwardedStderr.push(chunk);
      },
    },
  );

  assert.deepEqual(forwardedStdout, ['out']);
  assert.deepEqual(forwardedStderr, ['err']);
  assert.equal(result.stdout, 'out');
  assert.equal(result.stderr, 'err');
});

test('runCommand includes stdout and stderr in failure errors', async () => {
  await assert.rejects(
    runCommand(
      process.execPath,
      [
        '-e',
        "process.stdout.write('out\\n'); process.stderr.write('err\\n'); process.exit(2);",
      ],
      {
        mode: 'pipe',
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Command failed:/);
      assert.match(error.message, /out/);
      assert.match(error.message, /err/);
      return true;
    },
  );
});

test('quoteWindowsArg leaves simple args alone and quotes risky ones', () => {
  assert.equal(quoteWindowsArg('--version'), '--version');
  assert.equal(quoteWindowsArg('C:\\tools\\wrangler'), 'C:\\tools\\wrangler');
  assert.equal(quoteWindowsArg('my project'), '"my project"');
  assert.equal(quoteWindowsArg('a"b'), '"a""b"');
  assert.equal(quoteWindowsArg('a&b'), '"a&b"');
});
