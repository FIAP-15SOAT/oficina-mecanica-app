resource "kubernetes_namespace_v1" "k8s_namespace" {
  metadata {
    name = var.k8s_namespace

    labels = {
      "app.kubernetes.io/part-of" = var.project_name
      "managed-by"                = "terraform"
    }
  }
}
