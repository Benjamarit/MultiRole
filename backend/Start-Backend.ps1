$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& .\mvnw.cmd --batch-mode --no-transfer-progress spring-boot:run
exit $LASTEXITCODE
