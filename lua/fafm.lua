-- read config
local file = io.open('credentials.json')
local text = file:read("*a")
file:close()
local config = cjson.decode(text)

-- Transplanted from iothub.lua local functions

local function getJobs()
    b, c, h = fa.request {
        url=config.api_base .. '/v1/flashairs/self/jobs',
        method='GET',
        headers={Authorization='Basic ' .. config.credential},
    }
    if c == 200 then
        return cjson.decode(b).jobs
    end
    print(c)
    return {}
end

local function getJob(job)
    b, c, h = fa.request {
        url=config.api_base .. '/v1/flashairs/self/jobs/' .. job.id,
        method='GET',
        headers={Authorization='Basic ' .. config.credential},
    }
    if c == 200 then
        local detail = cjson.decode(b)
        detail.etag = string.match(h, "Etag:%s*([a-zA-Z0-9]*)")
        return detail
    end
    return nil
end

local function execJob(job)
    if job.request.type == "script" then
        local script = loadfile(job.request.path)
        if script == nil then
            updateJob(job, {s=0, message="loadfile failed."})
            return
        end
        arguments = job.request.arguments
        local ok, result = pcall(script)
        if ok then
            updateJob(job, {s=1, message="successfully executed.", result=result})
            return
        end
        updateJob(job, {s=0, message=result})
    end
end

local function updateJob(job, response)
    local body = cjson.encode({response=response, status='executed'})
    b, c, h = fa.request {
        url=config.api_base .. '/v1/flashairs/self/jobs/' .. job.id,
        method='PATCH',
        headers={
            ['Authorization']='Basic ' .. config.credential,
            ['Content-Length']=tostring(string.len(body)),
            ['Content-Type']='application/json',
            ['If-Match']=job.etag,
        },
        body=body,
    }
end

local function runJob()
    local jobs = getJobs()
    for i, job in ipairs(jobs) do
        if job.status ~= "executed" then
            local detail = getJob(job)
            if detail ~= nil then
                execJob(detail)
            end
        end
    end
end

return {
    runJob=runJob
}