import subprocess, sys

# run tests first
test_result = subprocess.run(
    ['npx', 'tsx', 'scripts/testEngines.ts'],
    cwd=r'F:\Downloads\Source\wincc-unified-log-calculator',
    capture_output=True, text=True, timeout=60
)
print('TEST STDOUT:', test_result.stdout)
print('TEST STDERR:', test_result.stderr)
if test_result.returncode != 0:
    sys.exit(test_result.returncode)

# run build
build_result = subprocess.run(
    ['npm', 'run', 'build'],
    cwd=r'F:\Downloads\Source\wincc-unified-log-calculator',
    capture_output=True, text=True, timeout=120
)
print('BUILD STDOUT:', build_result.stdout)
print('BUILD STDERR:', build_result.stderr)
if build_result.returncode != 0:
    sys.exit(build_result.returncode)

# git commit
subprocess.run(
    ['git', 'add', '.'],
    cwd=r'F:\Downloads\Source\wincc-unified-log-calculator',
    capture_output=True, text=True, timeout=60
)
subprocess.run(
    ['git', 'commit', '-m', 'fix(engine): dynamic flash life estimation and storage overflow alert v2.11.1', '--author', 'M-Galymzhan <galymzhan.manarbekuly@gmail.com>'],
    cwd=r'F:\Downloads\Source\wincc-unified-log-calculator',
    capture_output=True, text=True, timeout=60
)

# git push
push_result = subprocess.run(
    ['git', 'push', 'origin', 'main'],
    cwd=r'F:\Downloads\Source\wincc-unified-log-calculator',
    capture_output=True, text=True, timeout=60
)
print('PUSH STDOUT:', push_result.stdout)
print('PUSH STDERR:', push_result.stderr)
print('PUSH RC:', push_result.returncode)
sys.exit(push_result.returncode)
