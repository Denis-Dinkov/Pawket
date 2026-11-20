Pod::Spec.new do |s|
  s.name           = 'PawketPayments'
  s.version        = '1.0.0'
  s.summary        = 'Pawket native helpers'
  s.license        = 'MIT'
  s.author         = 'Pawket'
  s.homepage       = 'https://github.com/'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
