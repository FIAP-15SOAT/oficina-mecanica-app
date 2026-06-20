output "k8s_namespace" {
  description = "Kubernetes namespace for the project"
  value       = kubernetes_namespace_v1.k8s_namespace.metadata[0].name
}

output "postgres_service_dns" {
  description = "In-cluster DNS for Postgres service"
  value       = "${kubernetes_service_v1.k8s_svc_postgres.metadata[0].name}.${kubernetes_namespace_v1.k8s_namespace.metadata[0].name}.svc.cluster.local"
}

output "postgres_service_port" {
  description = "Postgres service port"
  value       = 5432
}
