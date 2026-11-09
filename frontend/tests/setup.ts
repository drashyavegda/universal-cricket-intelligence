import os from 'node:os';
import path from 'node:path';

// Keep test runs away from the developer's .data directory.
process.env.DATA_DIR = path.join(os.tmpdir(), `ucip-test-${process.pid}`);
process.env.REFERENCE_DATE = '2027-04-01';
process.env.DEMO_MODE = 'true';
