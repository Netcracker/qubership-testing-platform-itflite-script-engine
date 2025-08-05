{{/* Helper functions, do NOT modify */}}
{{- define "env.compose" }}
{{- range $key, $val := ( include "env.lines" . | fromYaml ) }}
{{ printf "- %s=%s" $key $val }}
{{- end }}
{{- end }}

{{- define "env.cloud" }}
{{- range $key, $val := ( include "env.lines" . | fromYaml ) }}
{{ printf "- name: %s" $key }}
{{ printf "  value: '%s'" $val }}
{{- end }}
{{- end }}

{{- define "env.default" -}}
{{- $ctx := get . "ctx" -}}
{{- $def := get . "def" | default $ctx.Values.SERVICE_NAME -}}
{{- $pre := get . "pre" | default (eq $ctx.Values.PAAS_PLATFORM "COMPOSE" | ternary "" $ctx.Release.Namespace) -}}
{{- get . "val" | default ((empty $pre | ternary $def (print $pre "_" (trimPrefix "atp-" $def))) | nospace | replace "-" "_") -}}
{{- end -}}

{{- define "securityContext.pod" -}}
runAsNonRoot: true
seccompProfile:
  type: "RuntimeDefault"
{{- with .Values.podSecurityContext }}
{{ toYaml . }}
{{- end -}}
{{- end -}}

{{- define "securityContext.container" -}}
allowPrivilegeEscalation: false
capabilities:
  drop: ["ALL"]
{{- with .Values.containerSecurityContext }}
{{ toYaml . }}
{{- end -}}
{{- end -}}
{{/* Helper functions end */}}

{{/* Environment variables to be used AS IS */}}
{{- define "env.lines" }}
ATP_HTTP_LOGGING: '{{ .Values.ATP_HTTP_LOGGING }}'
ATP_HTTP_LOGGING_HEADERS: '{{ .Values.ATP_HTTP_LOGGING_HEADERS }}'
ATP_HTTP_LOGGING_HEADERS_IGNORE: '{{ .Values.ATP_HTTP_LOGGING_HEADERS_IGNORE }}'
ATP_HTTP_LOGGING_URI_IGNORE: '{{ .Values.ATP_HTTP_LOGGING_URI_IGNORE }}'
ATP_ITF_LITE_HTTP_REQUEST_SIZE_MB: '{{ .Values.ATP_ITF_LITE_HTTP_REQUEST_SIZE_MB }}'
ATP_ITF_LITE_HTTP_RESPONSE_SIZE_MB: '{{ .Values.ATP_ITF_LITE_HTTP_RESPONSE_SIZE_MB }}'
ATP_ITF_LITE_CONNECTION_TIMEOUT: '{{ .Values.ATP_ITF_LITE_CONNECTION_TIMEOUT }}'
GRAYLOG_HOST: '{{ .Values.GRAYLOG_HOST }}'
GRAYLOG_ON: '{{ .Values.GRAYLOG_ON }}'
GRAYLOG_PORT: '{{ .Values.GRAYLOG_PORT }}'
LOG_LEVEL: '{{ .Values.LOG_LEVEL }}'
MONITORING_ENABLED: '{{ .Values.MONITORING_ENABLED }}'
MONITORING_PORT: '{{ .Values.MONITORING_PORT }}'
NODE_OPTIONS: '{{ .Values.NODE_OPTIONS }}'
SERVICE_NAME: '{{ .Values.SERVICE_NAME }}'
{{- end }}
