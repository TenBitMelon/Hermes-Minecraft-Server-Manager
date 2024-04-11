import childProcess, { type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';

interface CommandResult {
  exitCode: number;
  err: string;
  out: string;
}

function command(childProc: ChildProcessWithoutNullStreams): Promise<CommandResult> {
  return new Promise((resolve, reject): void => {
    childProc.on('error', (err): void => {
      reject(err);
    });

    const result: CommandResult = {
      exitCode: -1,
      err: '',
      out: ''
    };

    childProc.stdout.on('data', (chunk): void => {
      result.out += chunk.toString();
    });

    childProc.stderr.on('data', (chunk): void => {
      result.err += chunk.toString();
    });

    childProc.on('exit', (exitCode): void => {
      result.exitCode = exitCode ?? -1;
      setTimeout(() => {
        if (exitCode === 0) {
          resolve(result);
        } else {
          reject(result);
        }
      }, 500);
    });
  });
}

export function zip(inPath: string, outPath: string) {
  return command(
    childProcess.spawn('zip', ['-r', '-y', outPath, '.'], {
      cwd: path.dirname(inPath)
    })
  );
}

export function unzip(inPath: string, outPath: string) {
  return command(
    childProcess.spawn('unzip', ['-o', inPath, '-d', outPath], {
      cwd: path.dirname(inPath)
    })
  );
}
