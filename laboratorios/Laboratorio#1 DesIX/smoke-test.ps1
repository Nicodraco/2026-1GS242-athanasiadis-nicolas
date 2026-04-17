param(
  [string]$ApiBase = "http://localhost:4000/api",
  [string]$FrontendUrl = "http://localhost:5173"
)

$ErrorActionPreference = "Stop"

Write-Host "Running PollClass smoke test..." -ForegroundColor Cyan

$health = Invoke-RestMethod -Method Get -Uri "$ApiBase/health"
if ($health.status -ne "ok") {
  throw "Backend health check failed."
}

$frontend = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $FrontendUrl
if ($frontend.StatusCode -ne 200) {
  throw "Frontend is not reachable."
}

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$teacherEmail = "teacher.$suffix@pollclass.local"
$studentEmail = "student.$suffix@pollclass.local"
$password = "test1234"

$teacherRegisterBody = @{
  name     = "Smoke Teacher"
  email    = $teacherEmail
  password = $password
  role     = "teacher"
} | ConvertTo-Json

$studentRegisterBody = @{
  name     = "Smoke Student"
  email    = $studentEmail
  password = $password
  role     = "student"
} | ConvertTo-Json

$teacherAuth = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/register" -ContentType "application/json" -Body $teacherRegisterBody
$studentAuth = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/register" -ContentType "application/json" -Body $studentRegisterBody
$teacherHeaders = @{ Authorization = "Bearer $($teacherAuth.token)" }
$studentHeaders = @{ Authorization = "Bearer $($studentAuth.token)" }

$createBody = @{
  question = "Smoke test poll"
  options  = @("Option A", "Option B")
} | ConvertTo-Json

$poll = Invoke-RestMethod -Method Post -Uri "$ApiBase/polls" -ContentType "application/json" -Body $createBody -Headers $teacherHeaders

$voteBody = @{
  optionId = $poll.options[0].id
} | ConvertTo-Json

$voteResult = Invoke-RestMethod -Method Post -Uri "$ApiBase/polls/$($poll.code)/votes" -ContentType "application/json" -Body $voteBody -Headers $studentHeaders
if ($voteResult.totalVotes -lt 1) {
  throw "Vote was not registered."
}

$results = Invoke-RestMethod -Method Get -Uri "$ApiBase/polls/$($poll.code)/results"

try {
  Invoke-RestMethod -Method Delete -Uri "$ApiBase/polls/$($poll.code)" -Headers $teacherHeaders | Out-Null
} catch {
  Write-Warning "Could not clean up test poll ($($poll.code))."
}

$summary = [PSCustomObject]@{
  backend_health         = $health.status
  frontend_status_code   = $frontend.StatusCode
  created_poll_code      = $poll.code
  total_votes_after_vote = $results.totalVotes
}

$summary | Format-List
Write-Host "Smoke test passed." -ForegroundColor Green
