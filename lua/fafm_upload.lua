-- Version 0.1.1

local current_path = arguments.current_path or "/"
local file_name = arguments.file_name

local function uploadFile(file_path)
  --read config
  local file = io.open('credentials.json')
  local text = file:read("*a")
  file:close()
  local config = cjson.decode(text)
  
  --get the size of the file
  local filesize = lfs.attributes(file_path,"size")
  if filesize == nil then
    return "Failed to find "..file_path.."... something wen't wrong!"
  end

  --Upload
  local boundary = "--61141483716826"
  local contenttype = "multipart/form-data; boundary=" .. boundary
  local mes = "--".. boundary .. "\r\n"
   .."Content-Disposition: form-data; name=\"file\"; filename=\""..file_path.."\"\r\n"
   .."Content-Type: text/plain\r\n"
   .."\r\n"
   .."<!--WLANSDFILE-->\r\n"
   .."--" .. boundary .. "--\r\n"

  local blen = filesize + string.len(mes) - 17
  local b,c,h = fa.request{
    url=config.api_base .. "/v1/flashairs/self/files",
    method="POST",
    headers={
      ['Authorization']='Basic ' .. config.credential,
      ["Content-Length"]=tostring(blen),
      ["Content-Type"]=contenttype,
    },
    file=file_path,
    body=mes
  }
  return b
end

return uploadFile(file_name)