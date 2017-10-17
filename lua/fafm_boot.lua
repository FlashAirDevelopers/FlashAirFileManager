-- Version 0.1.1

local fafm = require("fafm")

while(1) do
  fafm.runJob()
  sleep(10000)
  collectgarbage("collect")
end